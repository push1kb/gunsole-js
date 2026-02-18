import { GunsoleClient } from "./client";
import type { GunsoleClientConfig } from "./types";

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
 *   bucket: "frontend",
 *   message: "User clicked button",
 * });
 * ```
 */
export function createGunsoleClient<Tags extends Record<string, string> = Record<string, string>>(
  config: GunsoleClientConfig
): GunsoleClient<Tags> {
  return new GunsoleClient<Tags>(config);
}