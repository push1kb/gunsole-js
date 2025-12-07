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
 */
export function getFetch(): typeof fetch {
  if (isBrowser()) {
    return window.fetch.bind(window);
  }
  if (isNode()) {
    // In Node.js 18+, fetch is available globally
    if (typeof globalThis.fetch !== "undefined") {
      return globalThis.fetch;
    }
    // Fallback for older Node.js versions
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node-fetch");
  }
  throw new Error("Unsupported environment: neither browser nor Node.js");
}
