import { createGunsoleClient } from "gunsole-js";
import { useEffect, useState } from "react";
import "./App.css";

const gunsole = createGunsoleClient({
  projectId: "test-project-react",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "React Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "react", bundler: "vite" },
});

function App() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("user-123");
  const [sessionId, setSessionId] = useState("session-abc");

  useEffect(() => {
    gunsole.setUser({ id: userId, email: "user@example.com" });
    gunsole.setSessionId(sessionId);
    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      level: "info",
      bucket: "app_lifecycle",
      message: "App mounted",
      context: { framework: "react" },
    });

    return () => {
      gunsole.detachGlobalErrorHandlers();
      gunsole.flush();
    };
  }, [userId, sessionId]);

  const handleLog = (level: "info" | "debug" | "warn" | "error") => {
    gunsole.log({
      level,
      bucket: "user_action",
      message: `User clicked ${level} log button`,
      context: { count, timestamp: Date.now() },
      tags: { action: "button_click", level },
    });
  };

  const handleIncrement = () => {
    const newCount = count + 1;
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
    <div className="app">
      <h1>Gunsole JS - React + Vite Test</h1>
      <div className="card">
        <div className="section">
          <h2>Counter: {count}</h2>
          <button type="button" onClick={handleIncrement}>
            Increment
          </button>
        </div>

        <div className="section">
          <h2>Log Actions</h2>
          <div className="button-group">
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

        <div className="section">
          <h2>User & Session</h2>
          <div className="input-group">
            <label>
              User ID:
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </label>
            <label>
              Session ID:
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="section">
          <h2>Actions</h2>
          <div className="button-group">
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
