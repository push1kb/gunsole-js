import { createGunsoleClient } from "@gunsole/web";

export const gunsole = createGunsoleClient({
  projectId: "test-project-solid",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Solid Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "solid", bundler: "vite" },
});
