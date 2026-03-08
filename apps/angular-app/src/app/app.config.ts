import {
  type ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { createGunsoleClient } from "@gunsole/web";

import { routes } from "./app.routes";

const gunsole = createGunsoleClient({
  projectId: "test-project-angular",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Angular App",
  appVersion: "1.0.0",
  defaultTags: { framework: "angular" },
});

class GunsoleErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    gunsole.fatal({
      message: err.message,
      bucket: "fatal",
      context: {
        name: err.name,
        stack: err.stack,
      },
    });
    console.error(err);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GunsoleErrorHandler },
  ],
};
