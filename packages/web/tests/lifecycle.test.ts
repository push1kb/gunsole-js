import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachWebLifecycle } from "../src/lifecycle";

function createMockClient() {
  return {
    drainBatch: vi.fn().mockReturnValue([]),
    flush: vi.fn().mockResolvedValue(undefined),
    setDebug: vi.fn(),
    projectId: "test-project",
    apiKey: "test-key",
    logEndpoint: "https://api.gunsole.com/logs",
    // biome-ignore lint/suspicious/noExplicitAny: mock client
  } as any;
}

describe("attachWebLifecycle", () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendBeacon on pagehide (#1)", () => {
    it("should send remaining logs via sendBeacon on pagehide", () => {
      const mockBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal("navigator", { sendBeacon: mockBeacon });

      mockClient.drainBatch.mockReturnValue([
        { message: "log 1", bucket: "test", level: "info", timestamp: 1 },
      ]);

      const detach = attachWebLifecycle(mockClient);
      window.dispatchEvent(new Event("pagehide"));

      expect(mockBeacon).toHaveBeenCalledOnce();
      expect(mockBeacon).toHaveBeenCalledWith(
        "https://api.gunsole.com/logs",
        expect.any(Blob)
      );

      detach();
    });

    it("should not call sendBeacon when batch is empty", () => {
      const mockBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal("navigator", { sendBeacon: mockBeacon });

      mockClient.drainBatch.mockReturnValue([]);

      const detach = attachWebLifecycle(mockClient);
      window.dispatchEvent(new Event("pagehide"));

      expect(mockBeacon).not.toHaveBeenCalled();

      detach();
    });

    it("should include projectId and apiKey in payload", () => {
      // Capture the raw string passed to the Blob constructor
      let capturedPayload = "";
      const OrigBlob = globalThis.Blob;
      vi.stubGlobal(
        "Blob",
        class extends OrigBlob {
          constructor(parts: BlobPart[], options?: BlobPropertyBag) {
            super(parts, options);
            capturedPayload = parts[0] as string;
          }
        }
      );

      const mockBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal("navigator", { sendBeacon: mockBeacon });

      mockClient.drainBatch.mockReturnValue([
        { message: "log 1", bucket: "test", level: "info", timestamp: 1 },
      ]);

      const detach = attachWebLifecycle(mockClient);
      window.dispatchEvent(new Event("pagehide"));

      const payload = JSON.parse(capturedPayload);
      expect(payload.projectId).toBe("test-project");
      expect(payload.apiKey).toBe("test-key");
      expect(payload.logs).toHaveLength(1);

      detach();
    });

    it("should not attach pagehide listener when disabled", () => {
      const addSpy = vi.spyOn(window, "addEventListener");

      const detach = attachWebLifecycle(mockClient, { sendBeacon: false });

      const pagehideCalls = addSpy.mock.calls.filter(
        (c) => c[0] === "pagehide"
      );
      expect(pagehideCalls).toHaveLength(0);

      detach();
    });
  });

  describe("online flush (#4)", () => {
    it("should flush on online event", () => {
      const detach = attachWebLifecycle(mockClient);
      window.dispatchEvent(new Event("online"));

      expect(mockClient.flush).toHaveBeenCalledOnce();

      detach();
    });

    it("should not attach online listener when disabled", () => {
      const addSpy = vi.spyOn(window, "addEventListener");

      const detach = attachWebLifecycle(mockClient, { networkAware: false });

      const onlineCalls = addSpy.mock.calls.filter((c) => c[0] === "online");
      expect(onlineCalls).toHaveLength(0);

      detach();
    });
  });

  describe("visibility flush (#10)", () => {
    it("should flush on visibilitychange (hidden)", () => {
      const detach = attachWebLifecycle(mockClient);

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      expect(mockClient.flush).toHaveBeenCalledOnce();

      detach();
    });

    it("should flush on visibilitychange (visible)", () => {
      const detach = attachWebLifecycle(mockClient);

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      expect(mockClient.flush).toHaveBeenCalledOnce();

      detach();
    });

    it("should not attach visibilitychange listener when disabled", () => {
      const addSpy = vi.spyOn(document, "addEventListener");

      const detach = attachWebLifecycle(mockClient, {
        visibilityAware: false,
      });

      const visCalls = addSpy.mock.calls.filter(
        (c) => c[0] === "visibilitychange"
      );
      expect(visCalls).toHaveLength(0);

      detach();
    });
  });

  describe("URL debug (#6)", () => {
    it("should enable debug from URL param", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?__gunsole_debug=true" },
        writable: true,
        configurable: true,
      });

      const detach = attachWebLifecycle(mockClient);

      expect(mockClient.setDebug).toHaveBeenCalledWith(true);
      expect(localStorage.getItem("__gunsole_debug")).toBe("true");

      localStorage.removeItem("__gunsole_debug");
      detach();
    });

    it("should enable debug from localStorage", () => {
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
        configurable: true,
      });
      localStorage.setItem("__gunsole_debug", "true");

      const detach = attachWebLifecycle(mockClient);

      expect(mockClient.setDebug).toHaveBeenCalledWith(true);

      localStorage.removeItem("__gunsole_debug");
      detach();
    });

    it("should clear debug with ?__gunsole_debug=false", () => {
      localStorage.setItem("__gunsole_debug", "true");
      Object.defineProperty(window, "location", {
        value: { search: "?__gunsole_debug=false" },
        writable: true,
        configurable: true,
      });

      const detach = attachWebLifecycle(mockClient);

      expect(localStorage.getItem("__gunsole_debug")).toBeNull();
      // setDebug should NOT have been called with true
      expect(mockClient.setDebug).not.toHaveBeenCalled();

      detach();
    });

    it("should not check URL when disabled", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?__gunsole_debug=true" },
        writable: true,
        configurable: true,
      });

      const detach = attachWebLifecycle(mockClient, { urlDebug: false });

      expect(mockClient.setDebug).not.toHaveBeenCalled();

      detach();
    });
  });

  describe("re-init guard (#18)", () => {
    it("should warn and return no-op on duplicate attach", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const detach1 = attachWebLifecycle(mockClient);
      const detach2 = attachWebLifecycle(mockClient);

      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toContain("already attached");

      // Second detach should be a no-op
      detach2();

      // First detach should still work and allow re-attach
      detach1();
    });

    it("should allow re-attach after detach", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const detach1 = attachWebLifecycle(mockClient);
      detach1();

      // Should not warn on re-attach
      const detach2 = attachWebLifecycle(mockClient);
      expect(warnSpy).not.toHaveBeenCalled();

      detach2();
    });
  });

  describe("detach", () => {
    it("should remove all event listeners", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const removeDocSpy = vi.spyOn(document, "removeEventListener");

      const detach = attachWebLifecycle(mockClient);
      detach();

      const removedWindowEvents = removeSpy.mock.calls.map((c) => c[0]);
      const removedDocEvents = removeDocSpy.mock.calls.map((c) => c[0]);

      expect(removedWindowEvents).toContain("pagehide");
      expect(removedWindowEvents).toContain("online");
      expect(removedDocEvents).toContain("visibilitychange");
    });
  });
});
