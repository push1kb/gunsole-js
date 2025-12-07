import type { BatchPayload, FetchFunction, InternalLogEntry } from "./types.js";
import { getFetch } from "./utils/env.js";

/**
 * Maximum number of retry attempts
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const BASE_DELAY_MS = 1000;

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

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.fetch(`${this.endpoint}/logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return; // Success
        }

        // Non-2xx response
        const errorText = await response.text().catch(() => "Unknown error");
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // If not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const delay = calculateBackoffDelay(attempt);
        await sleep(delay);
      }
    }

    // All retries failed - silently swallow the error
    // This ensures the SDK never crashes the host application
    // In production, you might want to log this to console in debug mode
    if (process.env.NODE_ENV === "development") {
      console.warn("[Gunsole] Failed to send logs after retries:", lastError);
    }
  }
}
