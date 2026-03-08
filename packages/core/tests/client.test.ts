import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGunsoleClient } from "../src/index";
import type { GunsoleClientConfig, LogLevel } from "../src/types";

async function gunzip(data: Uint8Array): Promise<string> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

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
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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
    mockFetch.mockRejectedValue(new Error("Network error"));

    client.log({
      message: "Test log",
      bucket: "test",
    });

    // Should not throw
    await expect(client.flush()).resolves.toBeUndefined();
  });

  it("should re-queue logs when flush fails", async () => {
    const mockFetch = vi.mocked(global.fetch);
    // First flush: all retries fail
    mockFetch.mockRejectedValue(new Error("Network error"));

    client.log({
      message: "Important log",
      bucket: "test",
    });

    await client.flush();

    // Logs should be re-queued — a second flush should retry them
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    await client.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    expect(body.logs[0].message).toBe("Important log");
  });
});

describe("Bucket methods", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
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
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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

    const levels: LogLevel[] = ["info", "debug", "warn", "error", "fatal"];

    for (const level of levels) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      client.auth[level](`${level} message`);
      await client.flush();

      // biome-ignore lint/style/noNonNullAssertion: test assertion
      const call = mockFetch.mock.calls.at(-1)!;
      const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
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
      "setDebug",
      "isDestroyed",
      "drainBatch",
      "projectId",
      "apiKey",
      "logEndpoint",
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

describe("isDisabled", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
      isDisabled: true,
    };
    vi.clearAllMocks();
  });

  it("should not send any logs when disabled", async () => {
    const mockFetch = vi.mocked(global.fetch);
    const client = createGunsoleClient(config);

    client.log({ message: "Test", bucket: "test" });
    client.info({ message: "Test", bucket: "test" });
    client.debug({ message: "Test", bucket: "test" });
    client.warn({ message: "Test", bucket: "test" });
    client.error({ message: "Test", bucket: "test" });

    await client.flush();

    expect(mockFetch).not.toHaveBeenCalled();
    await client.destroy();
  });

  it("should not attach global error handlers when disabled", () => {
    const client = createGunsoleClient(config);
    const listenersBefore = process.listenerCount("uncaughtException");

    client.attachGlobalErrorHandlers();

    expect(process.listenerCount("uncaughtException")).toBe(listenersBefore);
    client.destroy();
  });

  it("should safely call setUser and setSessionId when disabled", () => {
    const client = createGunsoleClient(config);

    expect(() => {
      client.setUser({ id: "user-1" });
      client.setSessionId("session-1");
    }).not.toThrow();

    client.destroy();
  });

  it("should safely call destroy when disabled", async () => {
    const client = createGunsoleClient(config);
    await expect(client.destroy()).resolves.toBeUndefined();
  });

  it("should noop bucket accessors when disabled", async () => {
    const mockFetch = vi.mocked(global.fetch);
    const client = createGunsoleClient({
      ...config,
      buckets: ["payment", "auth"],
    });

    client.payment("User paid");
    client.auth.error("Login failed");

    await client.flush();

    expect(mockFetch).not.toHaveBeenCalled();
    await client.destroy();
  });
});

describe("Destroyed state guard", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
    };
    vi.clearAllMocks();
  });

  it("should not queue logs after destroy()", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const client = createGunsoleClient(config);
    await client.destroy();

    mockFetch.mockClear();

    client.log({ message: "After destroy", bucket: "test" });
    client.info({ message: "After destroy", bucket: "test" });
    client.warn({ message: "After destroy", bucket: "test" });

    await client.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not update user or session after destroy()", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const client = createGunsoleClient(config);
    await client.destroy();

    // Should not throw
    client.setUser({ id: "user-1" });
    client.setSessionId("session-1");
  });

  it("should be safe to call destroy() multiple times", async () => {
    const client = createGunsoleClient(config);
    await client.destroy();
    await expect(client.destroy()).resolves.toBeUndefined();
  });
});

describe("Queue size cap", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
    };
    vi.clearAllMocks();
  });

  it("should drop oldest entries when queue exceeds maxQueueSize on push", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const client = createGunsoleClient({
      ...config,
      maxQueueSize: 3,
      batchSize: 100, // prevent auto-flush
    });

    client.log({ message: "Log 1", bucket: "test" });
    client.log({ message: "Log 2", bucket: "test" });
    client.log({ message: "Log 3", bucket: "test" });
    client.log({ message: "Log 4", bucket: "test" });
    client.log({ message: "Log 5", bucket: "test" });

    await client.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    expect(body.logs).toHaveLength(3);
    // Oldest entries (Log 1, Log 2) should have been dropped
    expect(body.logs[0].message).toBe("Log 3");
    expect(body.logs[1].message).toBe("Log 4");
    expect(body.logs[2].message).toBe("Log 5");

    await client.destroy();
  });

  it("should enforce cap when re-queuing failed logs", async () => {
    const mockFetch = vi.mocked(global.fetch);
    // All retries fail
    mockFetch.mockRejectedValue(new Error("Network error"));

    const client = createGunsoleClient({
      ...config,
      maxQueueSize: 2,
      batchSize: 100,
    });

    // Fill queue with 3 logs
    client.log({ message: "Log 1", bucket: "test" });
    client.log({ message: "Log 2", bucket: "test" });

    // Flush fails → logs re-queued, then add another
    await client.flush();

    client.log({ message: "Log 3", bucket: "test" });

    // Now try flushing again with success
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    await client.flush();

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    // Queue capped at 2, so only most recent 2 should survive
    expect(body.logs.length).toBeLessThanOrEqual(2);

    await client.destroy();
  });
});

describe("Retry cap on re-queued batches", () => {
  let config: GunsoleClientConfig;
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  let originalSetTimeout: any;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
    };
    // Skip all timer delays so transport retries resolve instantly
    originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal(
      "setTimeout",
      (fn: (...args: unknown[]) => void, _ms?: number) =>
        originalSetTimeout(fn, 0)
    );
    // resetAllMocks (not clearAllMocks) to flush leftover once-implementations
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should drop entries after 10 flush failures", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValue(new Error("Network error"));

    const client = createGunsoleClient({
      ...config,
      batchSize: 100,
    });

    client.log({ message: "Persistent failure", bucket: "test" });

    // Flush 10 times — all fail
    for (let i = 0; i < 10; i++) {
      await client.flush();
    }

    // After 10 failures the entry should be dropped
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    await client.flush();

    // Should not have sent anything — the entry was dropped
    expect(mockFetch).not.toHaveBeenCalled();

    await client.destroy();
  });

  it("should keep entries under the retry cap alive", async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValue(new Error("Network error"));

    const client = createGunsoleClient({
      ...config,
      batchSize: 100,
    });

    client.log({ message: "Will survive", bucket: "test" });

    // Flush 5 times (under the cap of 10)
    for (let i = 0; i < 5; i++) {
      await client.flush();
    }

    // Now succeed
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    await client.flush();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(await gunzip(call[1]?.body as Uint8Array));
    expect(body.logs[0].message).toBe("Will survive");
    // _flushAttempts should be stripped from the payload
    expect(body.logs[0]._flushAttempts).toBeUndefined();

    await client.destroy();
  });
});

describe("drainBatch", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
    };
    vi.clearAllMocks();
  });

  it("should return and clear pending entries", () => {
    const client = createGunsoleClient({
      ...config,
      batchSize: 100,
    });

    client.log({ message: "Log 1", bucket: "test" });
    client.log({ message: "Log 2", bucket: "test" });

    const drained = client.drainBatch();
    expect(drained).toHaveLength(2);
    expect(drained[0].message).toBe("Log 1");
    expect(drained[1].message).toBe("Log 2");

    // Batch should be empty after drain
    const second = client.drainBatch();
    expect(second).toHaveLength(0);

    client.destroy();
  });

  it("should return empty array when no logs", () => {
    const client = createGunsoleClient(config);
    expect(client.drainBatch()).toHaveLength(0);
    client.destroy();
  });
});

describe("Config getters", () => {
  it("should expose projectId", () => {
    const client = createGunsoleClient({
      projectId: "my-project",
      mode: "cloud",
    });
    expect(client.projectId).toBe("my-project");
    client.destroy();
  });

  it("should expose apiKey", () => {
    const client = createGunsoleClient({
      projectId: "test",
      apiKey: "secret-key",
      mode: "cloud",
    });
    expect(client.apiKey).toBe("secret-key");
    client.destroy();
  });

  it("should expose logEndpoint with default cloud endpoint", () => {
    const client = createGunsoleClient({
      projectId: "test",
      mode: "cloud",
    });
    expect(client.logEndpoint).toBe("https://api.gunsole.com/logs");
    client.destroy();
  });

  it("should expose logEndpoint with custom endpoint", () => {
    const client = createGunsoleClient({
      projectId: "test",
      mode: "cloud",
      endpoint: "https://custom.example.com",
    });
    expect(client.logEndpoint).toBe("https://custom.example.com/logs");
    client.destroy();
  });
});

describe("Global error handlers", () => {
  let config: GunsoleClientConfig;

  beforeEach(() => {
    config = {
      projectId: "test-project",
      apiKey: "test-api-key",
      mode: "cloud",
    };
    vi.clearAllMocks();
  });

  it("should attach and detach Node.js process handlers", () => {
    const client = createGunsoleClient(config);
    const listenersBefore = process.listenerCount("uncaughtException");

    client.attachGlobalErrorHandlers();
    expect(process.listenerCount("uncaughtException")).toBe(
      listenersBefore + 1
    );
    expect(process.listenerCount("unhandledRejection")).toBeGreaterThan(0);

    client.detachGlobalErrorHandlers();
    expect(process.listenerCount("uncaughtException")).toBe(listenersBefore);

    client.destroy();
  });

  it("should not attach handlers twice", () => {
    const client = createGunsoleClient(config);
    const listenersBefore = process.listenerCount("uncaughtException");

    client.attachGlobalErrorHandlers();
    client.attachGlobalErrorHandlers(); // second call should be a no-op

    expect(process.listenerCount("uncaughtException")).toBe(
      listenersBefore + 1
    );

    client.detachGlobalErrorHandlers();
    client.destroy();
  });

  it("should detach handlers on destroy", () => {
    const client = createGunsoleClient(config);
    const listenersBefore = process.listenerCount("uncaughtException");

    client.attachGlobalErrorHandlers();
    expect(process.listenerCount("uncaughtException")).toBe(
      listenersBefore + 1
    );

    client.destroy();
    expect(process.listenerCount("uncaughtException")).toBe(listenersBefore);
  });

  it("should be safe to detach without attaching first", () => {
    const client = createGunsoleClient(config);

    expect(() => client.detachGlobalErrorHandlers()).not.toThrow();

    client.destroy();
  });
});
