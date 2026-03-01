import { describe, expect, it } from "vitest";
import { normalizeConfig, resolveEndpoint } from "../src/config";

describe("resolveEndpoint", () => {
  it("should return cloud endpoint", () => {
    expect(resolveEndpoint("cloud")).toBe("https://api.gunsole.com");
  });

  it("should return desktop endpoint", () => {
    expect(resolveEndpoint("desktop")).toBe("http://localhost:8787");
  });

  it("should return local endpoint", () => {
    expect(resolveEndpoint("local")).toBe("http://localhost:17655");
  });

  it("should use custom endpoint when provided", () => {
    expect(resolveEndpoint("cloud", "https://custom.example.com")).toBe(
      "https://custom.example.com"
    );
  });
});

describe("normalizeConfig", () => {
  it("should throw if projectId is missing", () => {
    expect(() =>
      normalizeConfig({ projectId: "", mode: "cloud" })
    ).toThrow("projectId is required");
  });

  it("should apply default values", () => {
    const config = normalizeConfig({
      projectId: "test",
      mode: "cloud",
    });

    expect(config.apiKey).toBe("");
    expect(config.env).toBe("");
    expect(config.appName).toBe("");
    expect(config.appVersion).toBe("");
    expect(config.batchSize).toBe(10);
    expect(config.flushInterval).toBe(5000);
    expect(config.defaultTags).toEqual({});
    expect(config.buckets).toEqual([]);
  });

  it("should resolve endpoint from mode", () => {
    const config = normalizeConfig({
      projectId: "test",
      mode: "desktop",
    });
    expect(config.endpoint).toBe("http://localhost:8787");
  });

  it("should allow custom endpoint to override mode", () => {
    const config = normalizeConfig({
      projectId: "test",
      mode: "cloud",
      endpoint: "https://custom.example.com",
    });
    expect(config.endpoint).toBe("https://custom.example.com");
  });

  it("should pass through all provided values", () => {
    const config = normalizeConfig({
      projectId: "my-project",
      apiKey: "my-key",
      mode: "cloud",
      env: "production",
      appName: "my-app",
      appVersion: "2.0.0",
      batchSize: 50,
      flushInterval: 10000,
      defaultTags: { team: "backend" },
      buckets: ["auth", "payment"],
    });

    expect(config.projectId).toBe("my-project");
    expect(config.apiKey).toBe("my-key");
    expect(config.env).toBe("production");
    expect(config.appName).toBe("my-app");
    expect(config.appVersion).toBe("2.0.0");
    expect(config.batchSize).toBe(50);
    expect(config.flushInterval).toBe(10000);
    expect(config.defaultTags).toEqual({ team: "backend" });
    expect(config.buckets).toEqual(["auth", "payment"]);
  });
});
