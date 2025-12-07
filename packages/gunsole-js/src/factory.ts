import { GunsoleClient } from "./client.js";
import type { GunsoleClientConfig } from "./types.js";

/**
 * Create a new Gunsole client instance
 *
 * @param config - Client configuration
 * @returns Gunsole client instance
 *
 * @example
 * ```ts
 * const gunsole = createGunsoleClient({
 *   projectId: "my-project",
 *   apiKey: "my-api-key",
 *   mode: "cloud",
 * });
 *
 * gunsole.log({
 *   level: "info",
 *   bucket: "user_action",
 *   message: "User clicked button",
 * });
 * ```
 */
export function createGunsoleClient(
  config: GunsoleClientConfig
): GunsoleClient {
  return new GunsoleClient(config);
}
