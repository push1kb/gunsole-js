import { type GunsoleClient, createGunsoleClient } from "@gunsole/core";
import { cookies } from "next/headers";
import { gunsoleConfig } from "./gunsole-config";

const COOKIE_NAME = "gunsole_session";

export async function getServerGunsole(): Promise<GunsoleClient> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  return createGunsoleClient({
    ...gunsoleConfig,
    sessionId,
    defaultTags: { ...gunsoleConfig.defaultTags, runtime: "server" },
  });
}
