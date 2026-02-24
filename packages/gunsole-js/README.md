# @gunsole/core

Gunsole JavaScript/TypeScript SDK for browser and Node.js environments.

## Installation

```bash
pnpm add @gunsole/core
# or
npm install @gunsole/core
# or
yarn add @gunsole/core
```

## Usage

### Basic Setup

```typescript
import { createGunsoleClient } from "@gunsole/core";

const gunsole = createGunsoleClient({
  projectId: "your-project-id",
  apiKey: "your-api-key",
  mode: "cloud", // or "desktop" | "local"
  env: "production",
  appName: "my-app",
  appVersion: "1.0.0",
});
```

### Logging

```typescript
// Simple log
gunsole.log({
  level: "info",
  bucket: "user_action",
  message: "User clicked button",
});

// Log with context and tags
gunsole.log({
  level: "error",
  bucket: "api_error",
  message: "Failed to fetch user data",
  context: {
    userId: "123",
    endpoint: "/api/users",
    statusCode: 500,
  },
  tags: {
    feature: "user-management",
    severity: "high",
  },
});
```

### User Tracking

```typescript
gunsole.setUser({
  id: "user-123",
  email: "user@example.com",
  name: "John Doe",
  traits: {
    plan: "premium",
    signupDate: "2024-01-01",
  },
});
```

### Session Tracking

```typescript
gunsole.setSessionId("session-abc-123");
```

### Global Error Handlers

```typescript
// Attach automatic error tracking
gunsole.attachGlobalErrorHandlers();

// Detach when done
gunsole.detachGlobalErrorHandlers();
```

### Manual Flush

```typescript
// Flush pending logs immediately
await gunsole.flush();
```

## Configuration

### Modes

- `cloud`: Sends logs to `https://api.gunsole.com` (default for SaaS)
- `desktop`: Sends logs to `http://localhost:8787` (Gunsole Desktop app)
- `local`: Sends logs to `http://localhost:17655` (local development)

### Options

- `projectId` (required): Your Gunsole project identifier
- `apiKey` (optional): Your API key (required for cloud mode)
- `mode` (required): Client mode (`"desktop" | "local" | "cloud"`)
- `endpoint` (optional): Custom endpoint URL (overrides mode default)
- `env` (optional): Environment name (e.g., "production", "staging")
- `appName` (optional): Application name
- `appVersion` (optional): Application version
- `defaultTags` (optional): Default tags applied to all logs
- `batchSize` (optional): Number of logs to batch before sending (default: 10)
- `flushInterval` (optional): Auto-flush interval in ms (default: 5000)

### Cleanup

```typescript
// Flush remaining logs and release resources
await gunsole.destroy();
```

> **Node.js note:** The `attachGlobalErrorHandlers()` method registers an `uncaughtException` listener. Be aware that in Node.js, uncaught exceptions leave the process in an undefined state. The SDK captures the error for logging but does not re-throw or exit — you may want to add your own handler that calls `process.exit(1)` after flushing.

## API Reference

See [SDK Reference](../../docs/sdk-reference.md) for full API documentation including typed buckets, tag schemas, and all configuration options.

## Features

- ✅ Browser and Node.js support
- ✅ Automatic batching and flushing
- ✅ Retry logic with exponential backoff
- ✅ Never crashes the host application
- ✅ TypeScript support with full type definitions
- ✅ Tree-shakeable ESM and CJS builds
- ✅ Global error handler integration

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## License

MIT

