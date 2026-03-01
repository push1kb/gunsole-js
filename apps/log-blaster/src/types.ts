interface LogEntry {
  level: "info" | "debug" | "warn" | "error";
  bucket: string;
  message: string;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export type { LogEntry };
