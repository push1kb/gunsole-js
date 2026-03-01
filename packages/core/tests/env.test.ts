import { describe, expect, it } from "vitest";
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
});
