import type { FetchFunction } from "@gunsole/core";

/**
 * Maximum body size (in bytes) for keepalive requests.
 * Browsers cap keepalive payloads at 64 KB; we use 80% as a safety margin.
 */
const MAX_KEEPALIVE_BYTES = 51 * 1024;

/**
 * Get byte length of a fetch body.
 * Returns -1 if the size cannot be determined synchronously.
 */
function getBodySize(body: BodyInit | null | undefined): number {
  if (body == null) {
    return -1;
  }
  if (typeof body === "string") {
    return new TextEncoder().encode(body).byteLength;
  }
  if (body instanceof Uint8Array) {
    return body.byteLength;
  }
  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }
  if (body instanceof Blob) {
    return body.size;
  }
  return -1;
}

/**
 * Create a fetch wrapper that adds `keepalive: true` when the body
 * is small enough (< 51 KB). Pass the result as the `fetch` config
 * option to `createGunsoleClient()`.
 */
export function createKeepaliveFetch(baseFetch?: FetchFunction): FetchFunction {
  const fetchFn = baseFetch ?? globalThis.fetch.bind(globalThis);

  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const size = getBodySize(init?.body);
    if (size >= 0 && size < MAX_KEEPALIVE_BYTES) {
      return fetchFn(input, { ...init, keepalive: true });
    }
    return fetchFn(input, init);
  };
}
