/**
 * Gunsole Web
 *
 * Browser-optimised wrapper around @gunsole/core with lifecycle baked in.
 *
 * @packageDocumentation
 */

export { createGunsoleClient } from "./factory";
export { createGunsoleClient as createGunsole } from "./factory";
export { createGunsoleClient as createGunsoleWeb } from "./factory";

// Session persistence
export { persistSession, GUNSOLE_SESSION_COOKIE } from "./session";

// Low-level primitives for advanced users
export { attachWebLifecycle } from "./lifecycle";
export { createKeepaliveFetch } from "./keepalive";
export type { DetachFunction, WebLifecycleOptions } from "./types";

// Re-export key types from core so consumers only need @gunsole/web
export type {
  ClientMode,
  FetchFunction,
  GunsoleClientConfig,
  GunsoleHooks,
  LogLevel,
  LogOptions,
  TagEntry,
  UserInfo,
  ValidTagSchema,
} from "@gunsole/core";
export { GunsoleClient, SDK_VERSION } from "@gunsole/core";
