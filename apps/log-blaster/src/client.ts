import { createGunsoleClient } from "@gunsole/core";

const gunsole = createGunsoleClient({
  projectId: "log-blaster-test",
  apiKey: "test-api-key",
  mode: "local",
  appName: "log-blaster",
  appVersion: "1.0.0",
  env: "development",
  batchSize: 25,
  flushInterval: 2000,
  defaultTags: { source: "log-blaster" },
});

gunsole.setUser({
  id: "user-42",
  email: "blaster@gunsole.dev",
  name: "Log Blaster",
});

gunsole.setSessionId(`session-${Date.now()}`);

export { gunsole };
