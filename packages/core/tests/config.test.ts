import { describe, expect, it } from "vitest";
import { normalizeConfig, resolveEndpoint } from "../src/config";

describe("resolveEndpoint", () => {
  it("should return cloud endpoint", () => {
    expect(resolveEndpoint("cloud")).toBe("https://api.gunsole.com");
  });

  it("should return desktop endpoint", () => {
    expect(resolveEndpoint("desktop")).toBe("http://localhost:17655");
  });

  it("should return local endpoint", () => {
    expect(resolveEndpoint("local")).toBe("https://local.gunsole.com");
  });

  it("should use custom endpoint when provided", () => {
    expect(resolveEndpoint("cloud", "https://custom.example.com")).toBe(
      "https://custom.example.com"
    );
  });
});

describe("normalizeConfig", () => {
  it("should throw if projectId is missing", () => {
    expect(() => normalizeConfig({ projectId: "", mode: "cloud" })).toThrow(
      "projectId is required"
    );
  });

  it("should throw if apiKey is missing for cloud mode", () => {
    expect(() => normalizeConfig({ projectId: "test", mode: "cloud" })).toThrow(
      "apiKey is required for cloud and local modes"
    );
  });

  it("should throw if apiKey is missing for local mode", () => {
    expect(() => normalizeConfig({ projectId: "test", mode: "local" })).toThrow(
      "apiKey is required for cloud and local modes"
    );
  });

  it("should not require apiKey for desktop mode", () => {
    const config = normalizeConfig({
      projectId: "test",
      mode: "desktop",
    });
    expect(config.apiKey).toBe("");
  });

  it("should apply default values", () => {
    const config = normalizeConfig({
      projectId: "test",
      apiKey: "test-key",
      mode: "cloud",
    });

    expect(config.apiKey).toBe("test-key");
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
    expect(config.endpoint).toBe("http://localhost:17655");
  });

  it("should allow custom endpoint to override mode", () => {
    const config = normalizeConfig({
      projectId: "test",
      apiKey: "test-key",
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

  it("should throw if batchSize is less than 1", () => {
    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        batchSize: 0,
      })
    ).toThrow("batchSize must be at least 1");

    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        batchSize: -5,
      })
    ).toThrow("batchSize must be at least 1");
  });

  it("should throw if flushInterval is less than 100ms", () => {
    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        flushInterval: 0,
      })
    ).toThrow("flushInterval must be at least 100ms");

    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        flushInterval: 50,
      })
    ).toThrow("flushInterval must be at least 100ms");
  });

  it("should accept valid batchSize and flushInterval", () => {
    const config = normalizeConfig({
      projectId: "test",
      apiKey: "k",
      mode: "cloud",
      batchSize: 1,
      flushInterval: 100,
    });
    expect(config.batchSize).toBe(1);
    expect(config.flushInterval).toBe(100);
  });

  it("should default maxQueueSize to 1000", () => {
    const config = normalizeConfig({
      projectId: "test",
      apiKey: "k",
      mode: "cloud",
    });
    expect(config.maxQueueSize).toBe(1000);
  });

  it("should pass through custom maxQueueSize", () => {
    const config = normalizeConfig({
      projectId: "test",
      apiKey: "k",
      mode: "cloud",
      maxQueueSize: 500,
    });
    expect(config.maxQueueSize).toBe(500);
  });

  it("should throw if maxQueueSize is less than 1", () => {
    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        maxQueueSize: 0,
      })
    ).toThrow("maxQueueSize must be at least 1");

    expect(() =>
      normalizeConfig({
        projectId: "test",
        apiKey: "k",
        mode: "cloud",
        maxQueueSize: -5,
      })
    ).toThrow("maxQueueSize must be at least 1");
  });
});
