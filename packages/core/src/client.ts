import { normalizeConfig } from "./config";
import { Transport } from "./transport";
import type {
  GunsoleClientConfig,
  GunsoleHooks,
  InternalLogEntry,
  LogLevel,
  LogOptions,
  UserInfo,
  ValidTagSchema,
} from "./types";
import { isDev } from "./utils/env";
import { TokenBucket } from "./utils/rate-limiter";

/**
 * Maximum number of flush attempts before dropping a log entry
 */
const MAX_FLUSH_ATTEMPTS = 10;

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
export class GunsoleClient<
  Tags extends Record<string, string> & ValidTagSchema = Record<string, string>,
> {
  private config: ReturnType<typeof normalizeConfig>;
  private transport: Transport;
  private batch: InternalLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private user: UserInfo | null = null;
  private sessionId: string | null = null;
  private globalHandlers: GlobalErrorHandlers = { attached: false };
  private readonly disabled: boolean;
  private destroyed = false;
  #isDebug: boolean;
  private rateLimiter: TokenBucket | null = null;

  constructor(config: GunsoleClientConfig) {
    this.config = normalizeConfig(config);
    this.disabled = config.isDisabled ?? false;
    this.#isDebug = this.config.isDebug;
    this.transport = new Transport(
      this.config.endpoint,
      this.config.apiKey,
      this.config.projectId,
      this.config.fetch,
      () => this.#shouldDebug()
    );

    if (this.disabled) {
      return;
    }

    this.sessionId = config.sessionId ?? crypto.randomUUID();

    // Set up rate limiter (0 = disabled)
    if (this.config.maxLogRate > 0) {
      this.rateLimiter = new TokenBucket(
        this.config.maxBurst,
        this.config.maxLogRate
      );
    }

    this.startFlushTimer();
  }

  /**
   * Whether this client has been destroyed
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Read-only project ID
   */
  get projectId(): string {
    return this.config.projectId;
  }

  /**
   * Read-only API key
   */
  get apiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Read-only log endpoint URL
   */
  get logEndpoint(): string {
    return `${this.config.endpoint}/logs`;
  }

  /**
   * Atomically drain and return all pending log entries
   */
  drainBatch(): InternalLogEntry[] {
    const entries = this.batch;
    this.batch = [];
    return entries;
  }

  /**
   * Enable or disable debug mode at runtime
   */
  setDebug(enabled: boolean): void {
    this.#isDebug = enabled;
  }

  #shouldDebug(): boolean {
    return this.#isDebug || isDev();
  }

  /**
   * Log a message. Defaults to info level.
   */
  log(options: LogOptions<Tags>): void;
  log(level: LogLevel, options: LogOptions<Tags>): void;
  log(
    levelOrOptions: LogLevel | LogOptions<Tags>,
    maybeOptions?: LogOptions<Tags>
  ): void {
    if (this.disabled || this.destroyed) {
      return;
    }
    const level: LogLevel =
      typeof levelOrOptions === "string" ? levelOrOptions : "info";
    const options: LogOptions<Tags> | undefined =
      typeof levelOrOptions === "string" ? maybeOptions : levelOrOptions;

    // ? This will never be undefined, it is just a type assertion
    if (!options) {
      return;
    }

    // Rate limiting check
    if (this.rateLimiter && !this.rateLimiter.tryConsume()) {
      if (this.#shouldDebug()) {
        console.warn("[Gunsole] Log dropped: rate limit exceeded");
      }
      return;
    }

    try {
      let internalEntry: InternalLogEntry = {
        level,
        bucket: options.bucket,
        message: options.message,
        context: options.context,
        timestamp: Date.now(),
        traceId: options.traceId,
        userId: options.userId ?? this.user?.id,
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

      // beforeSend hook
      if (this.config.beforeSend) {
        try {
          const result = this.config.beforeSend(internalEntry);
          if (result === null) {
            return;
          }
          internalEntry = result;
        } catch {
          // Keep original entry on throw
        }
      }

      this.batch.push(internalEntry);
      this.enforceQueueCap();

      // onLog hook
      this.#invokeHook("onLog", internalEntry);

      // Flush if batch is full
      if (this.batch.length >= this.config.batchSize) {
        this.flush();
      }
    } catch {
      // Silently swallow — never crash the host app
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
   * Log a fatal-level message (unrecoverable errors)
   */
  fatal(options: LogOptions<Tags>): void {
    this.log("fatal", options);
  }

  /**
   * Set user information
   */
  setUser(user: UserInfo): void {
    if (this.disabled || this.destroyed) {
      return;
    }
    this.user = user;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    if (this.disabled || this.destroyed) {
      return;
    }
    this.sessionId = sessionId;
  }

  /**
   * Flush pending logs to the API
   */
  async flush(): Promise<void> {
    if (this.disabled) {
      return;
    }
    const logsToSend = [...this.batch];
    if (logsToSend.length === 0) {
      return;
    }
    this.batch = [];

    // Increment flush attempt counter on each entry
    for (const entry of logsToSend) {
      entry._flushAttempts = (entry._flushAttempts ?? 0) + 1;
    }

    try {
      await this.transport.sendBatch(logsToSend);
      this.#invokeHook("onFlush", logsToSend, true);
    } catch (error) {
      this.#invokeHook("onFlush", logsToSend, false);
      this.#invokeHook("onError", error);

      // Filter out entries that have exceeded the retry cap
      const retriable = logsToSend.filter(
        (entry) => (entry._flushAttempts ?? 0) < MAX_FLUSH_ATTEMPTS
      );
      const dropped = logsToSend.length - retriable.length;

      if (dropped > 0 && this.#shouldDebug()) {
        console.warn(
          `[Gunsole] Dropped ${dropped} log(s) after ${MAX_FLUSH_ATTEMPTS} flush attempts`
        );
      }

      // Re-queue surviving logs so they can be retried on next flush
      this.batch.unshift(...retriable);
      this.enforceQueueCap();
      if (this.#shouldDebug()) {
        console.warn("[Gunsole] Error in flush():", error);
      }
    }
  }

  /**
   * Attach global error handlers
   */
  attachGlobalErrorHandlers(): void {
    if (this.disabled) {
      return;
    }
    try {
      if (this.globalHandlers.attached) {
        return;
      }

      // Unhandled promise rejections
      this.globalHandlers.unhandledRejection = (
        event: PromiseRejectionEvent
      ) => {
        this.fatal({
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
        this.fatal({
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
          this.fatal({
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
          this.fatal({
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
      if (this.#shouldDebug()) {
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
      if (this.#shouldDebug()) {
        console.warn("[Gunsole] Error in detachGlobalErrorHandlers():", error);
      }
    }
  }

  /**
   * Invoke a hook safely (never throws)
   */
  #invokeHook<K extends keyof GunsoleHooks>(
    name: K,
    ...args: Parameters<NonNullable<GunsoleHooks[K]>>
  ): void {
    try {
      const hook = this.config.hooks[name];
      if (hook) {
        // biome-ignore lint/suspicious/noExplicitAny: hook signatures vary
        (hook as any)(...args);
      }
    } catch {
      // Hooks must never crash the SDK
    }
  }

  /**
   * Drop oldest entries when the queue exceeds maxQueueSize
   */
  private enforceQueueCap(): void {
    const overflow = this.batch.length - this.config.maxQueueSize;
    if (overflow > 0) {
      this.batch.splice(0, overflow);
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
   * Cleanup resources. Awaiting ensures remaining logs are flushed.
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    this.stopFlushTimer();
    this.detachGlobalErrorHandlers();
    await this.flush();
    this.user = null;
    this.sessionId = null;
    this.destroyed = true;
  }
}
