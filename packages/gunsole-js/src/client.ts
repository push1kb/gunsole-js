import { normalizeConfig } from "./config";
import { Transport } from "./transport";
import type {
  GunsoleClientConfig,
  InternalLogEntry,
  LogLevel,
  UserInfo,
} from "./types";
import { normalizeTimestamp } from "./utils/time";

/**
 * Global error handler state
 */
interface GlobalErrorHandlers {
  unhandledRejection?: (event: PromiseRejectionEvent) => void;
  unhandledRejectionNode?: (reason: unknown, promise: Promise<unknown>) => void;
  error?: (event: ErrorEvent) => void;
  uncaughtException?: (error: Error) => void;
  attached: boolean;
}

/**
 * Gunsole client for sending logs and events
 */
export class GunsoleClient {
  private config: ReturnType<typeof normalizeConfig>;
  private transport: Transport;
  private batch: InternalLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private user: UserInfo | null = null;
  private sessionId: string | null = null;
  private globalHandlers: GlobalErrorHandlers = { attached: false };

  constructor(config: GunsoleClientConfig) {
    this.config = normalizeConfig(config);
    this.transport = new Transport(
      this.config.endpoint,
      this.config.apiKey,
      this.config.projectId,
      this.config.fetch
    );
    this.startFlushTimer();
  }

  /**
   * Log an info-level message
   */
  log(
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    this.logEntry("info", message, bucket, context, tags);
  }

  /**
   * Log an info-level message
   */
  info(
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    this.logEntry("info", message, bucket, context, tags);
  }

  /**
   * Log a debug-level message
   */
  debug(
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    this.logEntry("debug", message, bucket, context, tags);
  }

  /**
   * Log a warn-level message
   */
  warn(
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    this.logEntry("warn", message, bucket, context, tags);
  }

  /**
   * Log an error-level message
   */
  error(
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    this.logEntry("error", message, bucket, context, tags);
  }

  /**
   * Internal method to log an entry
   */
  private logEntry(
    level: LogLevel,
    message: string,
    bucket: string,
    context?: Record<string, unknown>,
    tags?: Record<string, string>
  ): void {
    try {
      const internalEntry: InternalLogEntry = {
        level,
        bucket,
        message,
        context,
        timestamp: normalizeTimestamp(undefined),
        userId: this.user?.id,
        sessionId: this.sessionId ?? undefined,
        env: this.config.env || undefined,
        appName: this.config.appName || undefined,
        appVersion: this.config.appVersion || undefined,
        tags: {
          ...this.config.defaultTags,
          ...tags,
        },
      };

      this.batch.push(internalEntry);

      // Flush if batch is full
      if (this.batch.length >= this.config.batchSize) {
        this.flush();
      }
    } catch (error) {
      // Silently swallow errors - never crash the host app
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in logEntry():", error);
      }
    }
  }

  /**
   * Set user information
   */
  setUser(user: UserInfo): void {
    try {
      this.user = user;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in setUser():", error);
      }
    }
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    try {
      this.sessionId = sessionId;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in setSessionId():", error);
      }
    }
  }

  /**
   * Flush pending logs to the API
   */
  async flush(): Promise<void> {
    try {
      if (this.batch.length === 0) {
        return;
      }

      const logsToSend = [...this.batch];
      this.batch = [];

      await this.transport.sendBatch(logsToSend);
    } catch (error) {
      // Silently swallow errors
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in flush():", error);
      }
    }
  }

  /**
   * Attach global error handlers
   */
  attachGlobalErrorHandlers(): void {
    try {
      if (this.globalHandlers.attached) {
        return;
      }

      // Unhandled promise rejections
      this.globalHandlers.unhandledRejection = (
        event: PromiseRejectionEvent
      ) => {
        this.error("Unhandled promise rejection", "unhandled_rejection", {
          reason: String(event.reason),
          error:
            event.reason instanceof Error
              ? {
                  name: event.reason.name,
                  message: event.reason.message,
                  stack: event.reason.stack,
                }
              : event.reason,
        });
      };

      // Global errors
      this.globalHandlers.error = (event: ErrorEvent) => {
        this.error(event.message || "Global error", "global_error", {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
            ? {
                name: event.error.name,
                message: event.error.message,
                stack: event.error.stack,
              }
            : undefined,
        });
      };

      if (typeof window !== "undefined") {
        window.addEventListener(
          "unhandledrejection",
          this.globalHandlers.unhandledRejection
        );
        window.addEventListener("error", this.globalHandlers.error);
      }

      if (typeof process !== "undefined") {
        this.globalHandlers.unhandledRejectionNode = (
          reason: unknown,
          _promise: Promise<unknown>
        ) => {
          this.error("Unhandled promise rejection", "unhandled_rejection", {
            reason: String(reason),
            error:
              reason instanceof Error
                ? {
                    name: reason.name,
                    message: reason.message,
                    stack: reason.stack,
                  }
                : reason,
          });
        };

        this.globalHandlers.uncaughtException = (error: Error) => {
          this.error(error.message, "uncaught_exception", {
            name: error.name,
            stack: error.stack,
          });
        };

        process.on(
          "unhandledRejection",
          this.globalHandlers.unhandledRejectionNode
        );
        process.on("uncaughtException", this.globalHandlers.uncaughtException);
      }

      this.globalHandlers.attached = true;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in attachGlobalErrorHandlers():", error);
      }
    }
  }

  /**
   * Detach global error handlers
   */
  detachGlobalErrorHandlers(): void {
    try {
      if (!this.globalHandlers.attached) {
        return;
      }

      if (typeof window !== "undefined") {
        if (this.globalHandlers.unhandledRejection) {
          window.removeEventListener(
            "unhandledrejection",
            this.globalHandlers.unhandledRejection
          );
        }
        if (this.globalHandlers.error) {
          window.removeEventListener("error", this.globalHandlers.error);
        }
      }

      if (typeof process !== "undefined") {
        if (this.globalHandlers.unhandledRejectionNode) {
          process.removeListener(
            "unhandledRejection",
            this.globalHandlers.unhandledRejectionNode
          );
        }
        if (this.globalHandlers.uncaughtException) {
          process.removeListener(
            "uncaughtException",
            this.globalHandlers.uncaughtException
          );
        }
      }

      this.globalHandlers = { attached: false };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Gunsole] Error in detachGlobalErrorHandlers():", error);
      }
    }
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop the automatic flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopFlushTimer();
    this.detachGlobalErrorHandlers();
    this.flush();
  }
}
