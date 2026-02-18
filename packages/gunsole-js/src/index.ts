/**
 * Gunsole JavaScript SDK
 *
 * A log-based developer tool and analytics system SDK for browser and Node.js.
 *
 * @packageDocumentation
 */

export { createGunsoleClient } from "./factory";
export { GunsoleClient } from "./client";
export type {
  BucketLogOptions,
  BucketLogger,
  ReservedBucketName,
  ValidateBuckets,
  WithBuckets,
} from "./buckets";
export type {
  ClientMode,
  GunsoleClientConfig,
  LogEntry,
  LogLevel,
  LogOptions,
  ReservedTagKey,
  TagEntry,
  UserInfo,
  ValidTagSchema,
} from "./types";
