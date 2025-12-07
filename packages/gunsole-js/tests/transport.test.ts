import { beforeEach, describe, expect, it, vi } from "vitest";
import { Transport } from "../src/transport.js";
import type { InternalLogEntry } from "../src/types.js";

// Mock fetch
global.fetch = vi.fn();

describe("Transport", () => {
  let transport: Transport;
  const endpoint = "https://api.gunsole.com";
  const apiKey = "test-api-key";
  const projectId = "test-project";

  beforeEach(() => {
    transport = new Transport(endpoint, apiKey, projectId);
    vi.clearAllMocks();
  });

  it("should send batch successfully", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: new Date().toISOString(),
      },
    ];

    await transport.sendBatch(logs);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(`${endpoint}/v1/logs`);
    expect(call[1]?.method).toBe("POST");
    expect(call[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    });

    const body = JSON.parse(call[1]?.body as string);
    expect(body.projectId).toBe(projectId);
    expect(body.logs).toEqual(logs);
  });

  it("should retry on failure with exponential backoff", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: new Date().toISOString(),
      },
    ];

    const startTime = Date.now();
    await transport.sendBatch(logs);
    const duration = Date.now() - startTime;

    // Should have retried 3 times (initial + 2 retries)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Should have waited for backoff (at least 1s + 2s = 3s)
    expect(duration).toBeGreaterThanOrEqual(2000);
  });

  it("should handle HTTP error responses", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid payload",
    } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: new Date().toISOString(),
      },
    ];

    // Should not throw, but retry
    await transport.sendBatch(logs);

    // Should have attempted retries
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should not send empty batches", async () => {
    const mockFetch = vi.mocked(global.fetch);

    await transport.sendBatch([]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should eventually give up after max retries", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValue(new Error("Persistent network error"));

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: new Date().toISOString(),
      },
    ];

    // Should not throw
    await expect(transport.sendBatch(logs)).resolves.toBeUndefined();

    // Should have tried MAX_RETRIES times
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
