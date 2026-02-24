import {
  type ValidateBuckets,
  type WithBuckets,
  attachBuckets,
} from "./buckets";
import { GunsoleClient } from "./client";
import type { GunsoleClientConfig, ValidTagSchema } from "./types";

/**
 * Config without buckets — used for overload resolution so that
 * a config with `buckets` falls through to the validated overload.
 */
type BaseConfig = Omit<GunsoleClientConfig, "buckets">;

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
 *   buckets: ["payment", "auth"],
 * });
 *
 * gunsole.payment("User paid");
 * gunsole.auth.error("Login failed");
 * ```
 */
export function createGunsoleClient<
  Tags extends Record<string, string> & ValidTagSchema = Record<
    string,
    string
  >,
>(config: BaseConfig): GunsoleClient<Tags>;
export function createGunsoleClient<
  Tags extends Record<string, string> & ValidTagSchema = Record<
    string,
    string
  >,
  const Buckets extends readonly string[] = readonly string[],
>(
  config: BaseConfig & {
    buckets: Buckets & NoInfer<ValidateBuckets<Buckets>>;
  }
): GunsoleClient<Tags> & WithBuckets<Tags, Buckets[number]>;
export function createGunsoleClient<
  Tags extends Record<string, string> & ValidTagSchema = Record<
    string,
    string
  >,
  const Buckets extends readonly string[] = readonly string[],
>(
  config: GunsoleClientConfig & { buckets?: Buckets }
): GunsoleClient<Tags> & WithBuckets<Tags, Buckets[number]> {
  const client = new GunsoleClient<Tags>(config);
  const buckets = config.buckets ?? [];
  if (buckets.length > 0) {
    return attachBuckets<Tags, Buckets[number]>(client, buckets);
  }
  return client as GunsoleClient<Tags> &
    WithBuckets<Tags, Buckets[number]>;
}
