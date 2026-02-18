import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGunsoleClient } from "../src/index.js";
import type { GunsoleClientConfig, LogLevel } from "../src/types.js";

// Mock fetch
global.fetch = vi.fn();

describe("GunsoleClient", () => {
  let config: GunsoleClientConfig;
  let client: ReturnType<typeof createGunsoleClient>;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
      isDebug: true,
    };
    client = createGunsoleClient(config);
    vi.clearAllMocks();
  });

  afterEach(() => {
    client.destroy();
  });

  it("should create a client with valid config", () => {
    expect(client).toBeDefined();
  });

  it("should batch logs and flush when batch size is reached", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    // Set batch size to 2 for testing
    const smallBatchClient = createGunsoleClient({
      ...config,
      batchSize: 2,
    });

    smallBatchClient.log({
      message: "Log 1",
      bucket: "test",
    });

    smallBatchClient.log({
      message: "Log 2",
      bucket: "test",
    });

    // Wait for async flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe("https://api.gunsole.com/logs");
    expect(call[1]?.method).toBe("POST");

    smallBatchClient.destroy();
  });

  it("should include user and session info in logs", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    client.setUser({
      id: "user-123",
      email: "test@example.com",
    });
    client.setSessionId("session-456");

    client.log({
      message: "Test log",
      bucket: "test",
    });

    await client.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.logs[0].userId).toBe("user-123");
    expect(body.logs[0].sessionId).toBe("session-456");
  });

  it("should merge default tags with log tags", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const taggedClient = createGunsoleClient({
      ...config,
      defaultTags: { env: "test", region: "us-east" },
    });

    taggedClient.log({
      message: "Test log",
      bucket: "test",
      tags: { feature: "auth" },
    });

    await taggedClient.flush();

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.logs[0].tags).toEqual({
      env: "test",
      region: "us-east",
      feature: "auth",
    });

    taggedClient.destroy();
  });

  it("should not throw errors on invalid log entries", () => {
    expect(() => {
      client.log({
        message: "",
        bucket: "",
      });
    }).not.toThrow();
  });

  it("should handle flush errors gracefully", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    client.log({
      message: "Test log",
      bucket: "test",
    });

    // Should not throw
    await expect(client.flush()).resolves.toBeUndefined();
  });
});

describe("Bucket methods", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
      isDebug: true,
    };
    vi.clearAllMocks();
  });

  it("should create bucket accessors as functions with level sub-methods", () => {
    const client = createGunsoleClient({
      ...config,
      buckets: ["payment", "auth"],
    });

    expect(typeof client.payment).toBe("function");
    expect(typeof client.auth).toBe("function");
    expect(typeof client.payment.info).toBe("function");
    expect(typeof client.payment.debug).toBe("function");
    expect(typeof client.payment.warn).toBe("function");
    expect(typeof client.payment.error).toBe("function");

    client.destroy();
  });

  it("should log at info level when calling bucket directly", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const client = createGunsoleClient({
      ...config,
      buckets: ["payment"],
    });

    client.payment("User paid");
    await client.flush();

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.logs[0].bucket).toBe("payment");
    expect(body.logs[0].message).toBe("User paid");
    expect(body.logs[0].level).toBe("info");

    client.destroy();
  });

  it("should log at correct level via sub-methods", async () => {
    const mockFetch = vi.mocked(global.fetch);

    const client = createGunsoleClient({
      ...config,
      buckets: ["auth"],
    });

    const levels: LogLevel[] = ["info", "debug", "warn", "error"];

    for (const level of levels) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      client.auth[level](`${level} message`);
      await client.flush();

      // biome-ignore lint/style/noNonNullAssertion: test assertion
      const call = mockFetch.mock.calls.at(-1)!;
      const body = JSON.parse(call[1]?.body as string);
      expect(body.logs[0].level).toBe(level);
      expect(body.logs[0].bucket).toBe("auth");
      expect(body.logs[0].message).toBe(`${level} message`);
    }

    client.destroy();
  });

  it("should pass through options like context and traceId", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const client = createGunsoleClient({
      ...config,
      buckets: ["payment"],
    });

    client.payment("Order completed", {
      context: { orderId: "abc-123" },
      traceId: "trace-1",
      tags: { region: "us" },
    });
    await client.flush();

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1]?.body as string);
    expect(body.logs[0].context).toEqual({ orderId: "abc-123" });
    expect(body.logs[0].traceId).toBe("trace-1");
    expect(body.logs[0].tags).toEqual({ region: "us" });

    client.destroy();
  });

  it("should throw on reserved name collision", () => {
    const reserved = [
      "log",
      "info",
      "debug",
      "warn",
      "error",
      "flush",
      "destroy",
      "setUser",
      "setSessionId",
      "attachGlobalErrorHandlers",
      "detachGlobalErrorHandlers",
    ];

    for (const name of reserved) {
      expect(() =>
        createGunsoleClient({
          ...config,
          buckets: [name],
        })
      ).toThrow(`Bucket name "${name}" conflicts with a reserved`);
    }
  });

  it("should work without buckets (backward compatible)", () => {
    const client = createGunsoleClient(config);

    expect(client).toBeDefined();
    expect(typeof client.log).toBe("function");
    expect(typeof client.info).toBe("function");

    client.destroy();
  });
});
