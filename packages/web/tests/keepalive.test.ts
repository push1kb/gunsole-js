import { describe, expect, it, vi } from "vitest";
import { createKeepaliveFetch } from "../src/keepalive";

describe("createKeepaliveFetch", () => {
  it("should add keepalive for small string body", async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const fetchFn = createKeepaliveFetch(baseFetch);

    await fetchFn("https://example.com", {
      method: "POST",
      body: "small payload",
    });

    expect(baseFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body: "small payload",
      keepalive: true,
    });
  });

  it("should add keepalive for small Uint8Array body", async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const fetchFn = createKeepaliveFetch(baseFetch);

    const body = new Uint8Array(100);
    await fetchFn("https://example.com", { method: "POST", body });

    expect(baseFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body,
      keepalive: true,
    });
  });

  it("should not add keepalive for body > 51 KB", async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const fetchFn = createKeepaliveFetch(baseFetch);

    const body = new Uint8Array(52 * 1024);
    await fetchFn("https://example.com", { method: "POST", body });

    expect(baseFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body,
    });
  });

  it("should not add keepalive when no body", async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const fetchFn = createKeepaliveFetch(baseFetch);

    await fetchFn("https://example.com", { method: "GET" });

    expect(baseFetch).toHaveBeenCalledWith("https://example.com", {
      method: "GET",
    });
  });

  it("should add keepalive for small Blob body", async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const fetchFn = createKeepaliveFetch(baseFetch);

    const body = new Blob(["small"]);
    await fetchFn("https://example.com", { method: "POST", body });

    expect(baseFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body,
      keepalive: true,
    });
  });

  it("should use globalThis.fetch when no base provided", async () => {
    const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockGlobalFetch);

    const fetchFn = createKeepaliveFetch();
    await fetchFn("https://example.com", {
      method: "POST",
      body: "test",
    });

    expect(mockGlobalFetch).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
