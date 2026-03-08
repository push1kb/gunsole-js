import {
  type GunsoleClient,
  type GunsoleClientConfig,
  createGunsoleClient as coreCreateGunsoleClient,
} from "@gunsole/core";
import { createKeepaliveFetch } from "./keepalive";
import { attachWebLifecycle } from "./lifecycle";
import type { WebLifecycleOptions } from "./types";

/**
 * Create a Gunsole client with browser lifecycle baked in.
 *
 * - Wraps fetch with keepalive support
 * - Attaches web lifecycle handlers (sendBeacon, visibility, network, URL debug)
 * - Attaches global error handlers
 * - `destroy()` detaches everything automatically
 */
export function createGunsoleClient(
  config: GunsoleClientConfig,
  lifecycleOptions?: WebLifecycleOptions
): GunsoleClient {
  const client = coreCreateGunsoleClient({
    ...config,
    fetch: createKeepaliveFetch(config.fetch),
  });

  const detachLifecycle = attachWebLifecycle(client, lifecycleOptions);
  client.attachGlobalErrorHandlers();

  const originalDestroy = client.destroy.bind(client);
  client.destroy = async () => {
    detachLifecycle();
    await originalDestroy();
  };

  return client;
}
