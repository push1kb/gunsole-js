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
  GunsoleClientConfig,
  LogEntry,
  LogLevel,
  UserInfo,
  ClientMode,
} from "./types";
