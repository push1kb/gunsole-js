import type { BatchPayload, FetchFunction, InternalLogEntry } from "./types";
import { getFetch } from "./utils/env";
import { SDK_VERSION } from "./version";

/**
 * Maximum number of retry attempts
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const BASE_DELAY_MS = 1000;

/**
 * Timeout for each fetch request (milliseconds)
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const base = BASE_DELAY_MS * 2 ** attempt;
  const jitter = 0.5 + Math.random();
  return Math.round(base * jitter);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gzip compress a string using the native Compression Streams API
 */
async function gzipCompress(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new Blob([encoder.encode(input)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Transport layer for sending logs to the Gunsole API
 */
export class Transport {
  private endpoint: string;
  private apiKey: string;
  private projectId: string;
  private fetch: FetchFunction;
  private isDebugFn: () => boolean;

  constructor(
    endpoint: string,
    apiKey: string,
    projectId: string,
    fetch?: FetchFunction,
    isDebugFn?: () => boolean
  ) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.fetch = fetch ?? getFetch();
    this.isDebugFn = isDebugFn ?? (() => false);
  }

  /**
   * Send a batch of logs to the API
   * Implements retry logic with exponential backoff
   */
  async sendBatch(logs: InternalLogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const payload: BatchPayload = {
      projectId: this.projectId,
      logs: logs.map(({ _flushAttempts: _, ...rest }) => rest),
    };

    const debug = this.isDebugFn();
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const json = JSON.stringify(payload, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        );

        let body: BodyInit;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Gunsole-SDK-Version": SDK_VERSION,
        };

        if (debug) {
          body = json;
        } else {
          body = (await gzipCompress(json)) as BodyInit;
          headers["Content-Encoding"] = "gzip";
        }

        if (this.apiKey) {
          headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS
        );

        let response: Response;
        try {
          response = await this.fetch(`${this.endpoint}/logs`, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.ok) {
          return;
        }

        // HTTP 413: payload too large — split and retry
        if (response.status === 413) {
          if (logs.length > 1) {
            const mid = Math.ceil(logs.length / 2);
            await this.sendBatch(logs.slice(0, mid));
            await this.sendBatch(logs.slice(mid));
          }
          // Single entry too large — silently drop
          return;
        }

        // Don't retry client errors (4xx) except 429 (rate limited)
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          return;
        }

        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = calculateBackoffDelay(attempt);
        await sleep(delay);
      }
    }

    throw lastError;
  }
}
