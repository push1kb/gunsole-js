"use client";

import {
  type GunsoleClient,
  createGunsoleClient,
  persistSession,
} from "@gunsole/web";
import { gunsoleConfig } from "./gunsole-config";

let gunsole: GunsoleClient | null = null;

export function getClientGunsole(): GunsoleClient {
  if (!gunsole) {
    gunsole = createGunsoleClient({
      ...gunsoleConfig,
      defaultTags: { ...gunsoleConfig.defaultTags, runtime: "client" },
    });
    persistSession(gunsole);
  }
  return gunsole;
}
