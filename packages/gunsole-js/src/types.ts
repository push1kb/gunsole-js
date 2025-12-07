/**
 * Fetch function type
 */
export type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * Log level enumeration
 */
export type LogLevel = "info" | "debug" | "warn" | "error";

/**
 * Client mode determines the default endpoint
 */
export type ClientMode = "desktop" | "local" | "cloud";

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Bucket/category for the log */
  bucket: string;
  /** Human-readable message */
  message: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Tags for filtering/grouping */
  tags?: Record<string, string>;
  /** Timestamp (ISO string or Unix timestamp) */
  timestamp?: string | number;
}

/**
 * User information
 */
export interface UserInfo {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email?: string;
  /** User display name */
  name?: string;
  /** Additional user traits */
  traits?: Record<string, unknown>;
}

/**
 * Client configuration options
 */
export interface GunsoleClientConfig {
  /** Project identifier */
  projectId: string;
  /** API key (public or secret) */
  apiKey: string;
  /** Client mode (desktop/local/cloud) */
  mode: ClientMode;
  /** Custom endpoint URL (overrides mode default) */
  endpoint?: string;
  /** Environment name (e.g., "production", "staging") */
  env?: string;
  /** Application name */
  appName?: string;
  /** Application version */
  appVersion?: string;
  /** Default tags applied to all logs */
  defaultTags?: Record<string, string>;
  /** Batch size for log batching (default: 10) */
  batchSize?: number;
  /** Flush interval in milliseconds (default: 5000) */
  flushInterval?: number;
  /** Custom fetch implementation (default: uses global fetch or throws error) */
  fetch?: FetchFunction;
}

/**
 * Internal log entry with metadata
 */
export interface InternalLogEntry extends LogEntry {
  /** Log level */
  level: LogLevel;
  /** User ID at time of log */
  userId?: string;
  /** Session ID at time of log */
  sessionId?: string;
  /** Environment */
  env?: string;
  /** Application name */
  appName?: string;
  /** Application version */
  appVersion?: string;
}

/**
 * Batch payload for transport
 */
export interface BatchPayload {
  projectId: string;
  logs: InternalLogEntry[];
}
