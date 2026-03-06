import type { GunsoleClient } from "@gunsole/core";
import type { DetachFunction, WebLifecycleOptions } from "./types";

const DEBUG_KEY = "__gunsole_debug";

/** WeakSet to track attached clients and prevent double-attach */
const attachedClients = new WeakSet<GunsoleClient>();

/**
 * Attach browser lifecycle handlers to a GunsoleClient.
 *
 * - sendBeacon on pagehide (#1)
 * - Online/offline awareness (#4)
 * - URL/localStorage debug activation (#6)
 * - Visibility-based flushing (#10)
 * - Re-init guard (#18)
 *
 * Returns a detach function that removes all listeners.
 */
export function attachWebLifecycle(
  client: GunsoleClient,
  options?: WebLifecycleOptions
): DetachFunction {
  // Re-init guard (#18)
  if (attachedClients.has(client)) {
    console.warn(
      "[Gunsole] Web lifecycle already attached to this client. " +
        "Call detach() first to re-attach."
    );
    return () => {};
  }

  const opts: Required<WebLifecycleOptions> = {
    sendBeacon: options?.sendBeacon ?? true,
    networkAware: options?.networkAware ?? true,
    visibilityAware: options?.visibilityAware ?? true,
    urlDebug: options?.urlDebug ?? true,
  };

  const cleanups: (() => void)[] = [];

  // URL/localStorage debug (#6)
  if (opts.urlDebug) {
    try {
      const params = new URLSearchParams(window.location.search);
      const debugParam = params.get(DEBUG_KEY);

      if (debugParam === "true") {
        localStorage.setItem(DEBUG_KEY, "true");
        client.setDebug(true);
      } else if (debugParam === "false") {
        localStorage.removeItem(DEBUG_KEY);
      } else if (localStorage.getItem(DEBUG_KEY) === "true") {
        client.setDebug(true);
      }
    } catch {
      // localStorage or URL access may throw in restricted contexts
    }
  }

  // sendBeacon on pagehide (#1)
  if (opts.sendBeacon) {
    const onPageHide = (): void => {
      const logs = client.drainBatch();
      if (logs.length === 0) {
        return;
      }

      const payload = JSON.stringify({
        projectId: client.projectId,
        apiKey: client.apiKey,
        logs,
      });

      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(client.logEndpoint, blob);
    };

    window.addEventListener("pagehide", onPageHide);
    cleanups.push(() => window.removeEventListener("pagehide", onPageHide));
  }

  // Online/offline (#4)
  if (opts.networkAware) {
    const onOnline = (): void => {
      client.flush();
    };

    window.addEventListener("online", onOnline);
    cleanups.push(() => window.removeEventListener("online", onOnline));
  }

  // Visibility (#10)
  if (opts.visibilityAware) {
    const onVisibilityChange = (): void => {
      client.flush();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    cleanups.push(() =>
      document.removeEventListener("visibilitychange", onVisibilityChange)
    );
  }

  attachedClients.add(client);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    attachedClients.delete(client);
  };
}
