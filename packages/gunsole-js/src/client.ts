import { normalizeConfig } from "./config.js";
import { Transport } from "./transport.js";
import type {
  GunsoleClientConfig,
  InternalLogEntry,
  LogEntry,
  LogLevel,
  UserInfo,
} from "./types.js";
import { normalizeTimestamp } from "./utils/time.js";

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
      this.config.projectId
    );
    this.startFlushTimer();
  }

  /**
   * Log an entry
   */
  log(entry: LogEntry): void {
    try {
      const internalEntry: InternalLogEntry = {
        ...entry,
        timestamp: normalizeTimestamp(entry.timestamp),
        userId: this.user?.id,
        sessionId: this.sessionId ?? undefined,
        env: this.config.env || undefined,
        appName: this.config.appName || undefined,
        appVersion: this.config.appVersion || undefined,
        tags: {
          ...this.config.defaultTags,
          ...entry.tags,
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
        console.warn("[Gunsole] Error in log():", error);
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
        this.log({
          level: "error",
          bucket: "unhandled_rejection",
          message: "Unhandled promise rejection",
          context: {
            reason: String(event.reason),
            error:
              event.reason instanceof Error
                ? {
                    name: event.reason.name,
                    message: event.reason.message,
                    stack: event.reason.stack,
                  }
                : event.reason,
          },
        });
      };

      // Global errors
      this.globalHandlers.error = (event: ErrorEvent) => {
        this.log({
          level: "error",
          bucket: "global_error",
          message: event.message || "Global error",
          context: {
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
          },
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
          this.log({
            level: "error",
            bucket: "unhandled_rejection",
            message: "Unhandled promise rejection",
            context: {
              reason: String(reason),
              error:
                reason instanceof Error
                  ? {
                      name: reason.name,
                      message: reason.message,
                      stack: reason.stack,
                    }
                  : reason,
            },
          });
        };

        this.globalHandlers.uncaughtException = (error: Error) => {
          this.log({
            level: "error",
            bucket: "uncaught_exception",
            message: error.message,
            context: {
              name: error.name,
              stack: error.stack,
            },
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
