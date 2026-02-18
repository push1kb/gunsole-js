import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGunsoleClient } from "../src/index.js";
import type { GunsoleClientConfig } from "../src/types.js";

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
