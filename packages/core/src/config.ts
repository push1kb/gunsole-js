import type { ClientMode, GunsoleClientConfig } from "./types";

/**
 * Default endpoints for each mode
 */
const DEFAULT_ENDPOINTS: Record<ClientMode, string> = {
  desktop: "http://localhost:17655",
  local: "https://local.gunsole.com",
  cloud: "https://api.gunsole.com",
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  batchSize: 10,
  flushInterval: 5000,
  maxQueueSize: 1000,
};

/**
 * Resolve the endpoint URL based on mode and custom endpoint
 */
export function resolveEndpoint(
  mode: ClientMode,
  customEndpoint?: string,
): string {
  if (customEndpoint) {
    return customEndpoint;
  }
  return DEFAULT_ENDPOINTS[mode];
}

/**
 * Normalize and validate client configuration
 */
export function normalizeConfig(config: GunsoleClientConfig): Omit<
  Required<GunsoleClientConfig>,
  "fetch" | "beforeSend" | "sessionId"
> & {
  endpoint: string;
  fetch?: GunsoleClientConfig["fetch"];
  beforeSend?: GunsoleClientConfig["beforeSend"];
  sessionId?: string;
} {
  if (!config.projectId) {
    throw new Error("projectId is required");
  }
  if (!config.apiKey && config.mode !== "desktop") {
    throw new Error("apiKey is required for cloud and local modes");
  }
  if (config.batchSize !== undefined && config.batchSize < 1) {
    throw new Error("batchSize must be at least 1");
  }
  if (config.flushInterval !== undefined && config.flushInterval < 100) {
    throw new Error("flushInterval must be at least 100ms");
  }
  if (config.maxQueueSize !== undefined && config.maxQueueSize < 1) {
    throw new Error("maxQueueSize must be at least 1");
  }
  if (
    config.maxLogRate !== undefined &&
    config.maxLogRate !== 0 &&
    config.maxLogRate < 1
  ) {
    throw new Error("maxLogRate must be 0 (disabled) or at least 1");
  }
  if (config.maxBurst !== undefined && config.maxBurst < 1) {
    throw new Error("maxBurst must be at least 1");
  }
  return {
    projectId: config.projectId,
    apiKey: config.apiKey ?? "",
    mode: config.mode,
    endpoint: resolveEndpoint(config.mode, config.endpoint),
    env: config.env ?? "",
    appName: config.appName ?? "",
    appVersion: config.appVersion ?? "",
    defaultTags: config.defaultTags ?? {},
    batchSize: config.batchSize ?? DEFAULT_CONFIG.batchSize,
    flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
    maxQueueSize: config.maxQueueSize ?? DEFAULT_CONFIG.maxQueueSize,
    fetch: config.fetch,
    isDisabled: config.isDisabled ?? false,
    buckets: config.buckets ?? [],
    isDebug: config.isDebug ?? false,
    maxLogRate: config.maxLogRate ?? 10,
    maxBurst: config.maxBurst ?? 100,
    beforeSend: config.beforeSend,
    hooks: config.hooks ?? {},
    sessionId: config.sessionId,
  };
}
