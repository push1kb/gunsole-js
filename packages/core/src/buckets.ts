import type { GunsoleClient } from "./client";
import type { LogLevel, LogOptions } from "./types";

/**
 * Log options for bucket methods (message is positional, bucket is implied)
 */
export type BucketLogOptions<
  Tags extends Record<string, string> = Record<string, string>,
> = Omit<LogOptions<Tags>, "bucket" | "message">;

/**
 * A callable bucket logger with level sub-methods
 */
export interface BucketLogger<
  Tags extends Record<string, string> = Record<string, string>,
> {
  (message: string, options?: BucketLogOptions<Tags>): void;
  info(message: string, options?: BucketLogOptions<Tags>): void;
  debug(message: string, options?: BucketLogOptions<Tags>): void;
  warn(message: string, options?: BucketLogOptions<Tags>): void;
  error(message: string, options?: BucketLogOptions<Tags>): void;
}

/**
 * Mapped type that adds bucket accessors to a client
 */
export type WithBuckets<
  Tags extends Record<string, string> = Record<string, string>,
  Buckets extends string = string,
> = { [K in Buckets]: BucketLogger<Tags> };

/**
 * Bucket names that conflict with GunsoleClient methods
 */
export type ReservedBucketName =
  | "log"
  | "info"
  | "debug"
  | "warn"
  | "error"
  | "setUser"
  | "setSessionId"
  | "flush"
  | "destroy"
  | "attachGlobalErrorHandlers"
  | "detachGlobalErrorHandlers";

/**
 * Validates a buckets tuple at the type level — reserved names become `never`
 */
export type ValidateBuckets<T extends readonly string[]> = {
  [K in keyof T]: T[K] extends ReservedBucketName ? never : T[K];
};

const RESERVED_NAMES: Set<string> = new Set<ReservedBucketName>([
  "log",
  "info",
  "debug",
  "warn",
  "error",
  "setUser",
  "setSessionId",
  "flush",
  "destroy",
  "attachGlobalErrorHandlers",
  "detachGlobalErrorHandlers",
]);

/**
 * Create a BucketLogger for a specific bucket name
 */
function createBucketLogger<
  Tags extends Record<string, string> = Record<string, string>,
>(client: GunsoleClient<Tags>, bucketName: string): BucketLogger<Tags> {
  const logAtLevel = (
    level: LogLevel,
    message: string,
    options?: BucketLogOptions<Tags>
  ): void => {
    client.log(level, {
      ...options,
      message,
      bucket: bucketName,
    } as LogOptions<Tags>);
  };

  const logger = ((message: string, options?: BucketLogOptions<Tags>): void => {
    logAtLevel("info", message, options);
  }) as BucketLogger<Tags>;

  logger.info = (message, options?) => logAtLevel("info", message, options);
  logger.debug = (message, options?) => logAtLevel("debug", message, options);
  logger.warn = (message, options?) => logAtLevel("warn", message, options);
  logger.error = (message, options?) => logAtLevel("error", message, options);

  return logger;
}

/**
 * Attach bucket accessors to a client instance
 */
export function attachBuckets<
  Tags extends Record<string, string> = Record<string, string>,
  Buckets extends string = string,
>(
  client: GunsoleClient<Tags>,
  buckets: readonly string[]
): GunsoleClient<Tags> & WithBuckets<Tags, Buckets> {
  for (const name of buckets) {
    if (RESERVED_NAMES.has(name)) {
      throw new Error(
        `Bucket name "${name}" conflicts with a reserved GunsoleClient method`
      );
    }
    (client as unknown as Record<string, unknown>)[name] =
      createBucketLogger(client, name);
  }
  return client as GunsoleClient<Tags> & WithBuckets<Tags, Buckets>;
}
