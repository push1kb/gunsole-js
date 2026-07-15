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
export type LogLevel = "info" | "debug" | "warn" | "error" | "fatal";

/**
 * Client mode determines the default endpoint
 */
export type ClientMode = "desktop" | "local" | "cloud";

/** Single-key tag entry derived from a tag schema */
export type TagEntry<T> = { [K in keyof T]: Pick<T, K> }[keyof T];

/**
 * Tag keys reserved by internal log entry fields.
 * Using these as tag keys would shadow internal metadata.
 */
export type ReservedTagKey =
  | "bucket"
  | "message"
  | "level"
  | "timestamp"
  | "userId"
  | "sessionId"
  | "env"
  | "appName"
  | "appVersion"
  | "liveId"
  | "traceId";

/**
 * Constrains a tag schema to exclude reserved internal field names.
 * Each reserved key must be `never` (i.e. absent) in a valid tag type.
 */
export type ValidTagSchema = { [K in ReservedTagKey]?: never };

/**
 * Options for logging methods (log, info, debug, warn, error, fatal)
 */
export interface LogOptions<
  Tags extends Record<string, string> = Record<string, string>,
> {
  /** Human-readable message */
  message: string;
  /** Bucket/category for the log */
  bucket: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Tags for filtering/grouping */
  tags?: Partial<Tags> | TagEntry<Tags>[];
  /** Trace ID for distributed tracing */
  traceId?: string;
  /** Per-call user ID override (useful for server-side contexts) */
  userId?: string;
  /** Marks this entry as a live-widget update. Entries sharing the same `liveId` coalesce in the pending batch (replace semantics), except `chart` widgets, which always append. Normally set via the `live*` helper methods. */
  liveId?: string;
  /** Structured live-widget payload. Normally set via the `live*` helper methods rather than directly. */
  live?: LiveWidgetPayload;
}

/**
 * Discriminant for live-widget payloads
 */
export type LiveWidgetType = "card" | "progress" | "table" | "chart";

/**
 * Data for a `card` live widget — replaces on each update
 */
export interface LiveCardData {
  /** Card body text */
  text: string;
}

/**
 * Data for a `progress` live widget — replaces on each update
 */
export interface LiveProgressData {
  /** Optional label shown above the progress bar */
  label?: string;
  /** Current progress value */
  current: number;
  /** Target/total value */
  total: number;
}

/**
 * A single cell value in a live table
 */
export type LiveTableCell = string | number | boolean | null;

/**
 * Data for a `table` live widget — replaces on each update
 */
export interface LiveTableData {
  /** Optional table title */
  title?: string;
  /** Column headers */
  columns: string[];
  /** Row data, one array of cells per row */
  rows: LiveTableCell[][];
}

/**
 * Data for a `chart` live widget — each entry appends ONE point.
 * Desktop defaults: `x` -> entry timestamp, `series` -> "value",
 * `chartType` -> "line", `maxPoints` -> 500.
 */
export interface LiveChartData {
  /** Chart rendering type (default: "line") */
  chartType?: "line" | "bar";
  /** Optional label for the chart */
  label?: string;
  /** X-axis value (default: entry timestamp) */
  x?: number | string;
  /** Y-axis value for this point */
  y: number;
  /** Series name, for multi-series charts (default: "value") */
  series?: string;
  /** Maximum number of points to retain (default: 500) */
  maxPoints?: number;
  /** When true, clears prior points for this chart before appending */
  reset?: boolean;
}

/**
 * Structured live-widget payload, discriminated on `widgetType`
 */
export type LiveWidgetPayload =
  | { widgetType: "card"; data: LiveCardData }
  | { widgetType: "progress"; data: LiveProgressData }
  | { widgetType: "table"; data: LiveTableData }
  | { widgetType: "chart"; data: LiveChartData };

/**
 * Options for the live* helper methods (liveCard, liveProgress, liveTable, liveChart)
 */
export interface LiveLogOptions<
  Tags extends Record<string, string> = Record<string, string>,
> {
  /** Bucket/category for the log (default: "live") */
  bucket?: string;
  /** Log level (default: "info") */
  level?: LogLevel;
  /** Tags for filtering/grouping */
  tags?: Partial<Tags> | TagEntry<Tags>[];
  /** Additional context data */
  context?: Record<string, unknown>;
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
 * Lifecycle hooks for the Gunsole client
 */
export interface GunsoleHooks {
  /** Called after a log entry is added to the batch */
  onLog?: (entry: InternalLogEntry) => void;
  /** Called after a flush attempt (success or failure) */
  onFlush?: (logs: InternalLogEntry[], success: boolean) => void;
  /** Called when a flush error occurs */
  onError?: (error: unknown) => void;
}

/**
 * Client configuration options
 */
export interface GunsoleClientConfig {
  /** Project identifier */
  projectId: string;
  /** API key (public or secret). Required for cloud and local modes. */
  apiKey?: string;
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
  /** Maximum number of log entries held in the queue (default: 1000). Oldest entries are dropped when exceeded. */
  maxQueueSize?: number;
  /** When true, all SDK methods become no-ops. Useful for disabling in specific environments. */
  isDisabled?: boolean;
  /** Typed bucket names for bucket accessor methods */
  buckets?: readonly string[];
  /** Enable debug mode (disables gzip, enables console warnings). Defaults to isDev() check. */
  isDebug?: boolean;
  /** Maximum log rate per second (default: 10, 0 to disable) */
  maxLogRate?: number;
  /** Maximum burst size for rate limiting (default: 100) */
  maxBurst?: number;
  /** Transform or filter log entries before batching. Return null to drop. */
  beforeSend?: (entry: InternalLogEntry) => InternalLogEntry | null;
  /** Lifecycle hooks */
  hooks?: GunsoleHooks;
  /** Explicit session ID (overrides auto-generated UUID). Useful for server-side contexts where a session ID is read from a cookie. */
  sessionId?: string;
}

/**
 * Internal log entry with metadata (sent to transport)
 */
export interface InternalLogEntry {
  /** Bucket/category for the log */
  bucket: string;
  /** Human-readable message */
  message: string;
  /** Log level */
  level: LogLevel;
  /** Timestamp (Unix milliseconds) - required */
  timestamp: number;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Tags for filtering/grouping */
  tags?: Record<string, string>;
  /** Trace ID for distributed tracing */
  traceId?: string;
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
  /** Marks this entry as a live-widget update */
  liveId?: string;
  /** Structured live-widget payload */
  live?: LiveWidgetPayload;
  /** @internal */
  _flushAttempts?: number;
}

/**
 * Batch payload for transport
 */
export interface BatchPayload {
  projectId: string;
  logs: InternalLogEntry[];
}
