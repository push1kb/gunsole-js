"use client";

import { createGunsoleClient } from "gunsole-js";
import { useEffect, useState } from "react";

const gunsole = createGunsoleClient({
  projectId: "test-project-nextjs",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Next.js App",
  appVersion: "1.0.0",
  defaultTags: { framework: "nextjs" },
});

export default function GunsoleTest() {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState("user-123");
  const [sessionId, setSessionId] = useState("session-abc");

  useEffect(() => {
    gunsole.setUser({ id: userId, email: "user@example.com" });
    gunsole.setSessionId(sessionId);
    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      message: "App mounted",
      bucket: "app_lifecycle",
      context: { framework: "nextjs" },
    });

    return () => {
      gunsole.detachGlobalErrorHandlers();
      gunsole.flush();
    };
  }, [userId, sessionId]);

  const handleLog = (level: "info" | "debug" | "warn" | "error") => {
    const logOptions = {
      message: `User clicked ${level} log button`,
      bucket: "user_action",
      context: { count, timestamp: Date.now() },
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
  };

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    gunsole.log({
      message: "Counter incremented",
      bucket: "counter",
      context: { count: newCount },
    });
  };

  const handleError = () => {
    gunsole.error({
      message: "Test error logged",
      bucket: "test_error",
      context: { error: "This is a test error", stack: "test stack" },
    });
  };

  const handleFlush = async () => {
    await gunsole.flush();
    alert("Logs flushed!");
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Gunsole JS - Next.js Test
      </h1>
      <div className="space-y-6">
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">Counter: {count}</h2>
          <button
            type="button"
            onClick={handleIncrement}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Increment
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">Log Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => handleLog("info")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Log Info
            </button>
            <button
              type="button"
              onClick={() => handleLog("debug")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Log Debug
            </button>
            <button
              type="button"
              onClick={() => handleLog("warn")}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Log Warn
            </button>
            <button
              type="button"
              onClick={() => handleLog("error")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Log Error
            </button>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">User & Session</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="block mb-2">User ID:</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </label>
            <label className="block">
              <span className="block mb-2">Session ID:</span>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </label>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Trigger Error Log
            </button>
            <button
              type="button"
              onClick={handleFlush}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Flush Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
