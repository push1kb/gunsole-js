/**
 * Get current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get current timestamp as Unix milliseconds
 */
export function getCurrentTimestampMs(): number {
  return Date.now();
}

/**
 * Normalize timestamp to ISO string
 */
export function normalizeTimestamp(timestamp?: string | number): string {
  if (!timestamp) {
    return getCurrentTimestamp();
  }
  if (typeof timestamp === "string") {
    return timestamp;
  }
  // Unix timestamp (milliseconds)
  return new Date(timestamp).toISOString();
}
