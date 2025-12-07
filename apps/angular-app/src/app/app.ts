import { Component, effect, type onDestroy, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterOutlet } from "@angular/router";
import { createGunsoleClient } from "gunsole-js";

const gunsole = createGunsoleClient({
  projectId: "test-project-angular",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Angular App",
  appVersion: "1.0.0",
  defaultTags: { framework: "angular" },
});

@Component({
  selector: "app-root",
  imports: [RouterOutlet, FormsModule],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements onDestroy {
  protected readonly count = signal(0);
  protected readonly userId = signal("user-123");
  protected readonly sessionId = signal("session-abc");

  constructor() {
    effect(() => {
      gunsole.setUser({ id: this.userId(), email: "user@example.com" });
      gunsole.setSessionId(this.sessionId());
    });

    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      message: "App initialized",
      bucket: "app_lifecycle",
      context: { framework: "angular" },
    });
  }

  ngOnDestroy(): void {
    gunsole.detachGlobalErrorHandlers();
    gunsole.flush();
  }

  protected handleLog(level: "info" | "debug" | "warn" | "error"): void {
    const logOptions = {
      message: `User clicked ${level} log button`,
      bucket: "user_action",
      context: { count: this.count(), timestamp: Date.now() },
      tags: { action: "button_click", level },
    };

    switch (level) {
      case "info":
        gunsole.info(logOptions);
        break;
      case "debug":
        gunsole.debug(logOptions);
        break;
      case "warn":
        gunsole.warn(logOptions);
        break;
      case "error":
        gunsole.error(logOptions);
        break;
    }
  }

  protected handleIncrement(): void {
    const newCount = this.count() + 1;
    this.count.set(newCount);
    gunsole.log({
      message: "Counter incremented",
      bucket: "counter",
      context: { count: newCount },
    });
  }

  protected handleError(): void {
    gunsole.error({
      message: "Test error logged",
      bucket: "test_error",
      context: { error: "This is a test error", stack: "test stack" },
    });
  }

  protected async handleFlush(): Promise<void> {
    await gunsole.flush();
    alert("Logs flushed!");
  }
}
