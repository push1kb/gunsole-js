import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as keepalive from "../src/keepalive";
import * as lifecycle from "../src/lifecycle";

// Spy on lifecycle and keepalive instead of mocking @gunsole/core
vi.mock("@gunsole/core", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@gunsole/core")>();
  return {
    ...orig,
    createGunsoleClient: vi.fn((config: Record<string, unknown>) => {
      // Return a minimal mock client that tracks calls
      const destroyMock = vi.fn().mockResolvedValue(undefined);
      return {
        destroy: destroyMock,
        attachGlobalErrorHandlers: vi.fn(),
        detachGlobalErrorHandlers: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
        drainBatch: vi.fn().mockReturnValue([]),
        setDebug: vi.fn(),
        projectId: config.projectId,
        apiKey: config.apiKey,
        logEndpoint: "http://localhost:17655/logs",
        _config: config,
      };
    }),
  };
});

describe("createGunsoleClient (web factory)", () => {
  let attachSpy: ReturnType<typeof vi.spyOn>;
  let detachFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    detachFn = vi.fn();
    attachSpy = vi
      .spyOn(lifecycle, "attachWebLifecycle")
      .mockReturnValue(detachFn);
    vi.spyOn(keepalive, "createKeepaliveFetch").mockReturnValue(
      vi.fn() as unknown as ReturnType<typeof keepalive.createKeepaliveFetch>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Import lazily so mocks are in place
  async function getFactory() {
    const mod = await import("../src/factory");
    return mod.createGunsoleClient;
  }

  it("should attach web lifecycle on creation", async () => {
    const create = await getFactory();
    const client = create({
      projectId: "test",
      apiKey: "key",
      mode: "local",
    });

    expect(attachSpy).toHaveBeenCalledOnce();
    expect(attachSpy).toHaveBeenCalledWith(client, undefined);
  });

  it("should pass lifecycle options through", async () => {
    const create = await getFactory();
    const opts = { sendBeacon: false, networkAware: false };
    const client = create(
      { projectId: "test", apiKey: "key", mode: "local" },
      opts
    );

    expect(attachSpy).toHaveBeenCalledWith(client, opts);
  });

  it("should attach global error handlers on creation", async () => {
    const create = await getFactory();
    const client = create({
      projectId: "test",
      apiKey: "key",
      mode: "local",
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock access
    expect((client as any).attachGlobalErrorHandlers).toHaveBeenCalledOnce();
  });

  it("should wrap fetch with keepalive", async () => {
    const { createGunsoleClient: coreFn } = await import("@gunsole/core");
    const create = await getFactory();
    const customFetch = vi.fn();

    create({
      projectId: "test",
      apiKey: "key",
      mode: "local",
      fetch: customFetch,
    });

    // Core should have received the keepalive-wrapped fetch, not the original
    // biome-ignore lint/suspicious/noExplicitAny: mock access
    const passedConfig = (coreFn as any).mock.calls.at(-1)[0];
    expect(passedConfig.fetch).not.toBe(customFetch);
  });

  it("should detach lifecycle before calling original destroy", async () => {
    const create = await getFactory();
    const client = create({
      projectId: "test",
      apiKey: "key",
      mode: "local",
    });

    await client.destroy();

    expect(detachFn).toHaveBeenCalledOnce();
  });
});
