/**
 * Mock implementations for testing
 */

import type { GunsoleClient } from "../src/client.js";
import type { LogEntry, UserInfo } from "../src/types.js";

/**
 * Create a mock Gunsole client for testing
 */
export function createMockGunsoleClient(): GunsoleClient {
  const logs: LogEntry[] = [];
  let user: UserInfo | null = null;
  let sessionId: string | null = null;

  return {
    log: (entry: LogEntry) => {
      logs.push(entry);
    },
    setUser: (userInfo: UserInfo) => {
      user = userInfo;
    },
    setSessionId: (id: string) => {
      sessionId = id;
    },
    flush: async () => {
      // Mock flush - does nothing
    },
    attachGlobalErrorHandlers: () => {
      // Mock - does nothing
    },
    detachGlobalErrorHandlers: () => {
      // Mock - does nothing
    },
    destroy: () => {
      // Mock cleanup
    },
    // Expose internal state for testing
    _getLogs: () => logs,
    _getUser: () => user,
    _getSessionId: () => sessionId,
  } as GunsoleClient & {
    _getLogs: () => LogEntry[];
    _getUser: () => UserInfo | null;
    _getSessionId: () => string | null;
  };
}
