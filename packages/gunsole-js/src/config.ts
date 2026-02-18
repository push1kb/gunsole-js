import type { ClientMode, GunsoleClientConfig } from "./types";

/**
 * Default endpoints for each mode
 */
const DEFAULT_ENDPOINTS: Record<ClientMode, string> = {
  desktop: "http://localhost:8787",
  local: "http://localhost:17655",
  cloud: "https://api.gunsole.com",
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  batchSize: 10,
  flushInterval: 5000,
};

/**
 * Resolve the endpoint URL based on mode and custom endpoint
 */
export function resolveEndpoint(
  mode: ClientMode,
  customEndpoint?: string
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
  "fetch"
> & {
  endpoint: string;
  fetch?: GunsoleClientConfig["fetch"];
} {
  if (!config.projectId) {
    throw new Error("projectId is required");
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
    fetch: config.fetch,
    isDebug: config.isDebug ?? false,
    buckets: config.buckets ?? [],
  };
}
