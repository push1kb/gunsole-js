import type { GunsoleClientConfig } from "@gunsole/core";

export const gunsoleConfig = {
  projectId: "test-project-nextjs",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Next.js App",
  appVersion: "1.0.0",
  defaultTags: { framework: "nextjs" },
} satisfies GunsoleClientConfig;
