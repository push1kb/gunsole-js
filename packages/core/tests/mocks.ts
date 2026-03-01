/**
 * Mock implementations for testing
 */

import type { GunsoleClient } from "../src/client";
import type { LogLevel, LogOptions, UserInfo } from "../src/types";

interface MockLogEntry {
  level: LogLevel;
  options: LogOptions;
}

/**
 * Create a mock Gunsole client for testing
 */
export function createMockGunsoleClient(): GunsoleClient & {
  _getLogs: () => MockLogEntry[];
  _getUser: () => UserInfo | null;
  _getSessionId: () => string | null;
} {
  const logs: MockLogEntry[] = [];
  let user: UserInfo | null = null;
  let sessionId: string | null = null;

  return {
    log(
      levelOrOptions: LogLevel | LogOptions,
      maybeOptions?: LogOptions
    ) {
      const level: LogLevel =
        typeof levelOrOptions === "string" ? levelOrOptions : "info";
      const options: LogOptions =
        typeof levelOrOptions === "string" ? maybeOptions! : levelOrOptions;
      logs.push({ level, options });
    },
    info: (options: LogOptions) => {
      logs.push({ level: "info", options });
    },
    debug: (options: LogOptions) => {
      logs.push({ level: "debug", options });
    },
    warn: (options: LogOptions) => {
      logs.push({ level: "warn", options });
    },
    error: (options: LogOptions) => {
      logs.push({ level: "error", options });
    },
    setUser: (userInfo: UserInfo) => {
      user = userInfo;
    },
    setSessionId: (id: string) => {
      sessionId = id;
    },
    flush: async () => {},
    attachGlobalErrorHandlers: () => {},
    detachGlobalErrorHandlers: () => {},
    destroy: async () => {},
    _getLogs: () => logs,
    _getUser: () => user,
    _getSessionId: () => sessionId,
  } as GunsoleClient & {
    _getLogs: () => MockLogEntry[];
    _getUser: () => UserInfo | null;
    _getSessionId: () => string | null;
  };
}
