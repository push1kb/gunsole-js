import { createGunsoleClient } from "@gunsole/web";

export const gunsole = createGunsoleClient({
  projectId: "test-project-react",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "React Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "react", bundler: "vite" },
});
