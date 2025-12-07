import { createGunsoleClient } from "gunsole-js";
import { createSignal, onCleanup, onMount } from "solid-js";
import "./App.css";

const gunsole = createGunsoleClient({
  projectId: "test-project-solid",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Solid Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "solid", bundler: "vite" },
});

function App() {
  const [count, setCount] = createSignal(0);
  const [userId, setUserId] = createSignal("user-123");
  const [sessionId, setSessionId] = createSignal("session-abc");

  onMount(() => {
    gunsole.setUser({ id: userId(), email: "user@example.com" });
    gunsole.setSessionId(sessionId());
    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      level: "info",
      bucket: "app_lifecycle",
      message: "App mounted",
      context: { framework: "solid" },
    });
  });

  onCleanup(() => {
    gunsole.detachGlobalErrorHandlers();
    gunsole.flush();
  });

  const handleLog = (level: "info" | "debug" | "warn" | "error") => {
    gunsole.log({
      level,
      bucket: "user_action",
      message: `User clicked ${level} log button`,
      context: { count: count(), timestamp: Date.now() },
      tags: { action: "button_click", level },
    });
  };

  const handleIncrement = () => {
    const newCount = count() + 1;
    setCount(newCount);
    gunsole.log({
      level: "info",
      bucket: "counter",
      message: "Counter incremented",
      context: { count: newCount },
    });
  };

  const handleError = () => {
    gunsole.log({
      level: "error",
      bucket: "test_error",
      message: "Test error logged",
      context: { error: "This is a test error", stack: "test stack" },
    });
  };

  const handleFlush = async () => {
    await gunsole.flush();
    alert("Logs flushed!");
  };

  return (
    <div class="app">
      <h1>Gunsole JS - Solid + Vite Test</h1>
      <div class="card">
        <div class="section">
          <h2>Counter: {count()}</h2>
          <button type="button" onClick={handleIncrement}>
            Increment
          </button>
        </div>

        <div class="section">
          <h2>Log Actions</h2>
          <div class="button-group">
            <button type="button" onClick={() => handleLog("info")}>
              Log Info
            </button>
            <button type="button" onClick={() => handleLog("debug")}>
              Log Debug
            </button>
            <button type="button" onClick={() => handleLog("warn")}>
              Log Warn
            </button>
            <button type="button" onClick={() => handleLog("error")}>
              Log Error
            </button>
          </div>
        </div>

        <div class="section">
          <h2>User & Session</h2>
          <div class="input-group">
            <label>
              User ID:
              <input
                type="text"
                value={userId()}
                onInput={(e) => setUserId(e.currentTarget.value)}
              />
            </label>
            <label>
              Session ID:
              <input
                type="text"
                value={sessionId()}
                onInput={(e) => setSessionId(e.currentTarget.value)}
              />
            </label>
          </div>
        </div>

        <div class="section">
          <h2>Actions</h2>
          <div class="button-group">
            <button type="button" onClick={handleError}>
              Trigger Error Log
            </button>
            <button type="button" onClick={handleFlush}>
              Flush Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
