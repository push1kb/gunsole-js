import { normalizeConfig } from "./config";
import { Transport } from "./transport";
import type {
  GunsoleClientConfig,
  InternalLogEntry,
  LogLevel,
  LogOptions,
  UserInfo,
} from "./types";

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
export class GunsoleClient<Tags extends Record<string, string> = Record<string, string>> {
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
      this.config.fetch,
      config.isDebug ?? false
    );
    this.startFlushTimer();
  }

  /**
   * Log a message. Defaults to info level.
   */
  log(options: LogOptions<Tags>): void;
  log(level: LogLevel, options: LogOptions<Tags>): void;
  log(levelOrOptions: LogLevel | LogOptions<Tags>, maybeOptions?: LogOptions<Tags>): void {
    const level: LogLevel = typeof levelOrOptions === "string" ? levelOrOptions : "info";
    const options: LogOptions<Tags> = typeof levelOrOptions === "string" ? maybeOptions! : levelOrOptions;
    try {
      const internalEntry: InternalLogEntry = {
        level,
        bucket: options.bucket,
        message: options.message,
        context: options.context,
        timestamp: Date.now(),
        traceId: options.traceId,
        userId: this.user?.id,
        sessionId: this.sessionId ?? undefined,
        env: this.config.env || undefined,
        appName: this.config.appName || undefined,
        appVersion: this.config.appVersion || undefined,
        tags: {
          ...this.config.defaultTags,
          ...(Array.isArray(options.tags)
            ? Object.assign({}, ...options.tags)
            : options.tags),
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
   * Log an info-level message
   */
  info(options: LogOptions<Tags>): void {
    this.log("info", options);
  }

  debug(options: LogOptions<Tags>): void {
    this.log("debug", options);
  }

  warn(options: LogOptions<Tags>): void {
    this.log("warn", options);
  }

  error(options: LogOptions<Tags>): void {
    this.log("error", options);
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
        this.error({
          message: "Unhandled promise rejection",
          bucket: "unhandled_rejection",
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
        this.error({
          message: event.message || "Global error",
          bucket: "global_error",
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
          this.error({
            message: "Unhandled promise rejection",
            bucket: "unhandled_rejection",
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
          this.error({
            message: error.message,
            bucket: "uncaught_exception",
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
