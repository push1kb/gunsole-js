import { describe, expect, it, vi } from "vitest";
import { getFetch, isBrowser, isNode } from "../src/utils/env";

describe("isNode", () => {
  it("should return true in Node.js environment", () => {
    expect(isNode()).toBe(true);
  });
});

describe("isBrowser", () => {
  it("should return false in Node.js environment", () => {
    expect(isBrowser()).toBe(false);
  });
});

describe("getFetch", () => {
  it("should return custom fetch when provided", () => {
    const customFetch = () => Promise.resolve(new Response());
    const result = getFetch(customFetch as Parameters<typeof getFetch>[0]);
    expect(result).toBe(customFetch);
  });

  it("should return globalThis.fetch in Node.js 18+", () => {
    const result = getFetch();
    expect(result).toBe(globalThis.fetch);
  });

  it("should fall back to globalThis.fetch in edge runtimes", async () => {
    const fakeFetch = vi.fn();
    vi.stubGlobal("process", undefined);
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("fetch", fakeFetch);

    vi.resetModules();
    const { getFetch: freshGetFetch } = await import("../src/utils/env");

    const result = freshGetFetch();
    expect(result).toBe(fakeFetch);

    vi.unstubAllGlobals();
  });

  it("should throw when fetch is unavailable everywhere", async () => {
    vi.stubGlobal("process", undefined);
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("fetch", undefined);

    vi.resetModules();
    const { getFetch: freshGetFetch } = await import("../src/utils/env");

    expect(() => freshGetFetch()).toThrow(
      "Unsupported environment: fetch is not available"
    );

    vi.unstubAllGlobals();
  });
});
