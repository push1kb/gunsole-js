import { beforeEach, describe, expect, it, vi } from "vitest";
import { Transport } from "../src/transport";
import type { InternalLogEntry } from "../src/types";

async function gunzip(data: Uint8Array): Promise<string> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

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
        timestamp: Date.now(),
      },
    ];

    await transport.sendBatch(logs);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(`${endpoint}/logs`);
    expect(call[1]?.method).toBe("POST");
    expect(call[1]?.headers).toMatchObject({
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      Authorization: `Bearer ${apiKey}`,
    });

    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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
        timestamp: Date.now(),
      },
    ];

    const startTime = Date.now();
    await transport.sendBatch(logs);
    const duration = Date.now() - startTime;

    // Should have retried 3 times (initial + 2 retries)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Should have waited for backoff (at least 500ms + 1000ms = 1500ms with jitter)
    expect(duration).toBeGreaterThanOrEqual(1400);
  });

  it("should not retry on 4xx client errors", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
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
        timestamp: Date.now(),
      },
    ];

    await transport.sendBatch(logs);

    // 4xx should not be retried — only 1 attempt
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should retry on 429 rate limit", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => "Rate limited",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: Date.now(),
      },
    ];

    await transport.sendBatch(logs);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should retry on 5xx server errors", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: Date.now(),
      },
    ];

    await transport.sendBatch(logs);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should not send empty batches", async () => {
    const mockFetch = vi.mocked(global.fetch);

    await transport.sendBatch([]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should throw after max retries are exhausted", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValue(new Error("Persistent network error"));

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Test log",
        timestamp: Date.now(),
      },
    ];

    await expect(transport.sendBatch(logs)).rejects.toThrow(
      "Persistent network error"
    );

    // Should have tried MAX_RETRIES times
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("should serialize BigInt values in context to strings", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "BigInt test",
        timestamp: Date.now(),
        context: { bigValue: BigInt("9007199254740993") },
      },
    ];

    await transport.sendBatch(logs);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    expect(body.logs[0].context.bigValue).toBe("9007199254740993");
  });

  it("should apply jitter to backoff delay", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // minimum jitter: 0.5x

    const mockFetch = vi.mocked(global.fetch);
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const logs: InternalLogEntry[] = [
      {
        level: "info",
        bucket: "test",
        message: "Jitter test",
        timestamp: Date.now(),
      },
    ];

    const startTime = Date.now();
    await transport.sendBatch(logs);
    const duration = Date.now() - startTime;

    // With Math.random()=0, jitter=0.5, delay = 1000 * 0.5 = 500ms
    expect(duration).toBeGreaterThanOrEqual(400);
    expect(duration).toBeLessThan(1500);

    vi.spyOn(Math, "random").mockRestore();
  });

  it("should strip _flushAttempts from sent payload", async () => {
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
        timestamp: Date.now(),
        _flushAttempts: 3,
      },
    ];

    await transport.sendBatch(logs);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    expect(body.logs[0]._flushAttempts).toBeUndefined();
    expect(body.logs[0].message).toBe("Test log");
  });

  it("should pass an AbortSignal to fetch requests", async () => {
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
        timestamp: Date.now(),
      },
    ];

    await transport.sendBatch(logs);

    const call = mockFetch.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
