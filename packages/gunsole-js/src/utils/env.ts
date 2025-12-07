import type { FetchFunction } from "../types";

/**
 * Check if running in a browser environment
 */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.document !== "undefined"
  );
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined"
  );
}

/**
 * Get fetch implementation (browser or Node.js)
 * If a custom fetch is provided, it will be used instead.
 */
export function getFetch(customFetch?: FetchFunction): FetchFunction {
  if (customFetch) {
    return customFetch;
  }

  if (isBrowser()) {
    return window.fetch.bind(window);
  }
  if (isNode()) {
    // In Node.js 18+, fetch is available globally
    if (typeof globalThis.fetch !== "undefined") {
      return globalThis.fetch;
    }
    // For older Node.js versions, user must provide their own fetch
    throw new Error(
      "fetch is not available. Please use Node.js 18+ or provide a custom fetch implementation in the config"
    );
  }
  throw new Error("Unsupported environment: neither browser nor Node.js");
}
