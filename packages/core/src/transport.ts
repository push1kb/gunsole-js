import type { BatchPayload, FetchFunction, InternalLogEntry } from "./types";
import { getFetch } from "./utils/env";

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
  return BASE_DELAY_MS * 2 ** attempt;
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

  constructor(
    endpoint: string,
    apiKey: string,
    projectId: string,
    fetch?: FetchFunction
  ) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.fetch = fetch ?? getFetch();
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
      logs,
    };

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const body = await gzipCompress(JSON.stringify(payload));
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
        };

        if (this.apiKey) {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
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
            body: body as BodyInit,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.ok) {
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
