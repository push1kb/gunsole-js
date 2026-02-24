# Gunsole JavaScript SDK Reference

## Installation

```bash
npm install @gunsole/core
# or
pnpm add @gunsole/core
# or
yarn add @gunsole/core
```

Requires Node.js >= 18. Zero runtime dependencies.

## Quick Start

```ts
import { createGunsoleClient } from "@gunsole/core";

const gunsole = createGunsoleClient({
  projectId: "my-project",
  apiKey: "my-api-key", // not used for local
  mode: "cloud",
});

gunsole.log({ bucket: "app", message: "Hello from Gunsole!" });
```

## Creating a Client

### `createGunsoleClient(config)`

Creates and returns a configured Gunsole client instance.

```ts
const gunsole = createGunsoleClient({
  projectId: "my-project",    // required
  apiKey: "my-api-key",       // optional: required for cloud/SaaS
  mode: "cloud",              // required: "cloud" | "desktop" | "local"
  endpoint: undefined,        // optional: overrides mode default
  env: "production",          // optional: environment name
  appName: "my-app",          // optional: application name
  appVersion: "1.2.0",        // optional: application version
  defaultTags: { region: "us-east" }, // optional: applied to all logs
  batchSize: 10,              // optional: flush after N logs (default: 10)
  flushInterval: 5000,        // optional: flush interval in ms (default: 5000)
  fetch: customFetch,         // optional: custom fetch implementation
  isDebug: false,             // optional: disables gzip when true
  buckets: ["payment", "auth"], // optional: typed bucket accessors
});
```

### Configuration Modes

| Mode        | Endpoint                    |
| ----------- | --------------------------- |
| `"cloud"`   | `https://api.gunsole.com`   |
| `"desktop"` | `http://localhost:8787`     |
| `"local"`   | `http://localhost:17655`    |

Setting `endpoint` overrides the mode default.

## Logging

### Basic Logging

```ts
// Default level is "info"
gunsole.log({ bucket: "app", message: "Something happened" });

// Explicit level
gunsole.log("error", {
  bucket: "app",
  message: "Something broke",
  context: { errorCode: 500 },
});
```

### Level Shortcuts

```ts
gunsole.info({ bucket: "app", message: "Info message" });
gunsole.debug({ bucket: "app", message: "Debug message" });
gunsole.warn({ bucket: "app", message: "Warning message" });
gunsole.error({ bucket: "app", message: "Error message" });
```

### Log Options

Every log method accepts a `LogOptions` object:

| Field     | Type                                    | Required | Description                        |
| --------- | --------------------------------------- | -------- | ---------------------------------- |
| `message` | `string`                                | yes      | Human-readable log message         |
| `bucket`  | `string`                                | yes      | Bucket/category for the log        |
| `context` | `Record<string, unknown>`               | no       | Additional structured data         |
| `tags`    | `Partial<Tags> \| TagEntry<Tags>[]`     | no       | Tags for filtering/grouping        |
| `traceId` | `string`                                | no       | Trace ID for distributed tracing   |

### Log Levels

`"info"` | `"debug"` | `"warn"` | `"error"`

## Typed Bucket Accessors

Buckets are Gunsole's core abstraction for grouping logs. Pass `buckets` in the config to get first-class typed accessors with full autocomplete.

### Basic Usage

```ts
const gunsole = createGunsoleClient({
  projectId: "my-project",
  apiKey: "my-api-key",
  mode: "cloud",
  buckets: ["payment", "auth", "api"],
});

// Direct call logs at "info" level
gunsole.payment("User completed checkout");

// Level sub-methods
gunsole.payment.info("Order created", { context: { orderId: "abc" } });
gunsole.payment.error("Payment declined", { context: { reason: "insufficient_funds" } });
gunsole.auth.warn("Suspicious login attempt");
gunsole.api.debug("Request received", { traceId: "trace-123" });
```

No `as const` needed. The factory uses a `const` generic parameter (TypeScript 5.0+) to infer literal tuple types automatically.

### Bucket Method Signature

Calling a bucket accessor directly or via a level sub-method:

```ts
gunsole.payment(message: string, options?: BucketLogOptions): void
gunsole.payment.info(message: string, options?: BucketLogOptions): void
gunsole.payment.debug(message: string, options?: BucketLogOptions): void
gunsole.payment.warn(message: string, options?: BucketLogOptions): void
gunsole.payment.error(message: string, options?: BucketLogOptions): void
```

`BucketLogOptions` is `LogOptions` without `bucket` and `message` (both are positional/implied):

```ts
{
  context?: Record<string, unknown>;
  tags?: Partial<Tags> | TagEntry<Tags>[];
  traceId?: string;
}
```

### Escape Hatch

The existing `log()` API still works with any bucket string. Bucket accessors are the typed surface; `log()` is the untyped escape hatch.

```ts
// Typed — autocomplete + compile-time check
gunsole.payment("User paid");

// Untyped — any bucket string accepted
gunsole.log({ bucket: "payment", message: "User paid" });
gunsole.log({ bucket: "some-dynamic-bucket", message: "..." });
```

### Reserved Bucket Names

Bucket names cannot conflict with existing `GunsoleClient` methods. The following names are reserved and will throw at initialization:

`log`, `info`, `debug`, `warn`, `error`, `setUser`, `setSessionId`, `flush`, `destroy`, `attachGlobalErrorHandlers`, `detachGlobalErrorHandlers`

This is enforced at **both** compile time and runtime:

```ts
// Compile-time error: Type 'string' is not assignable to type 'never'
const gunsole = createGunsoleClient({
  projectId: "p",
  apiKey: "k",
  mode: "cloud",
  buckets: ["log"], // ← TS error
});
```

### Backward Compatibility

Omitting `buckets` returns a plain `GunsoleClient` — no phantom properties, no behavior change.

```ts
// No buckets — returns GunsoleClient<Tags> (clean type, no index signature)
const gunsole = createGunsoleClient({
  projectId: "p",
  apiKey: "k",
  mode: "cloud",
});
```

## Typed Tags

### Tag Schema

Define a tag schema as a generic parameter for compile-time tag safety:

```ts
type MyTags = {
  region: string;
  feature: string;
};

const gunsole = createGunsoleClient<MyTags>({
  projectId: "my-project",
  apiKey: "my-api-key",
  mode: "cloud",
  buckets: ["payment"],
});

// Autocomplete + type checking on tag keys
gunsole.payment("Checkout", { tags: { region: "us-east", feature: "checkout" } });

// Error: 'invalid' does not exist in type 'Partial<MyTags>'
gunsole.payment("Checkout", { tags: { invalid: "value" } });
```

### Tag Entries

Tags can be passed as a partial object or as an array of single-key entries:

```ts
// Object form
gunsole.log({
  bucket: "app",
  message: "Event",
  tags: { region: "us-east", feature: "auth" },
});

// Array form (useful for dynamic tag assembly)
gunsole.log({
  bucket: "app",
  message: "Event",
  tags: [{ region: "us-east" }, { feature: "auth" }],
});
```

### Reserved Tag Keys

Tag keys that collide with internal log entry fields are rejected at compile time. The following tag keys are reserved:

`bucket`, `message`, `level`, `timestamp`, `userId`, `sessionId`, `env`, `appName`, `appVersion`

```ts
// Compile-time error: Type '{ level: string }' does not satisfy ValidTagSchema
const gunsole = createGunsoleClient<{ level: string }>({
  projectId: "p",
  apiKey: "k",
  mode: "cloud",
});
```

### Default Tags

Tags set in config are merged with per-log tags (per-log tags take precedence):

```ts
const gunsole = createGunsoleClient({
  projectId: "p",
  apiKey: "k",
  mode: "cloud",
  defaultTags: { env: "production", region: "us-east" },
});

gunsole.log({
  bucket: "app",
  message: "Event",
  tags: { feature: "auth" },
});
// Sent tags: { env: "production", region: "us-east", feature: "auth" }
```

## User & Session Tracking

```ts
gunsole.setUser({
  id: "user-123",
  email: "user@example.com",  // optional
  name: "Jane Doe",           // optional
  traits: { plan: "pro" },    // optional
});

gunsole.setSessionId("session-456");
```

User ID and session ID are automatically attached to all subsequent logs.

## Batching & Flushing

Logs are batched and sent automatically:

- When the batch reaches `batchSize` (default: 10)
- Every `flushInterval` milliseconds (default: 5000)

Manual flush:

```ts
await gunsole.flush();
```

## Global Error Handlers

Automatically capture unhandled errors and promise rejections:

```ts
gunsole.attachGlobalErrorHandlers();

// Later, to detach:
gunsole.detachGlobalErrorHandlers();
```

Captures:
- Browser: `window.onerror`, `window.onunhandledrejection`
- Node.js: `process.uncaughtException`, `process.unhandledRejection`

Errors are logged to predefined buckets: `global_error`, `unhandled_rejection`, `uncaught_exception`.

## Lifecycle

Always call `destroy()` on teardown to flush remaining logs, stop the flush timer, and detach error handlers:

```ts
gunsole.destroy();
```

### Framework Integration

**React:**
```ts
useEffect(() => {
  const gunsole = createGunsoleClient({ ... });
  return () => gunsole.destroy();
}, []);
```

**Solid.js:**
```ts
onCleanup(() => gunsole.destroy());
```

**Angular:**
```ts
ngOnDestroy() { this.gunsole.destroy(); }
```

## Transport

- HTTP POST to `${endpoint}/logs`
- Retry with exponential backoff: 1s, 2s, 4s (max 3 attempts)
- Gzip compression enabled by default (disabled when `isDebug: true`)
- All errors silently handled — the SDK never crashes the host app

## Exports

### Runtime

| Export                  | Description                        |
| ----------------------- | ---------------------------------- |
| `createGunsoleClient`   | Factory function to create client  |
| `GunsoleClient`         | Client class                       |

### Types

| Export                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `GunsoleClientConfig`  | Configuration options                                 |
| `LogEntry`             | Log entry structure                                   |
| `LogLevel`             | `"info" \| "debug" \| "warn" \| "error"`             |
| `LogOptions`           | Options passed to log methods                         |
| `TagEntry`             | Single-key tag entry type                             |
| `UserInfo`             | User information                                      |
| `ClientMode`           | `"cloud" \| "desktop" \| "local"`                     |
| `BucketLogOptions`     | Log options for bucket methods (no bucket/message)    |
| `BucketLogger`         | Callable bucket accessor interface                    |
| `WithBuckets`          | Mapped type adding bucket accessors to client         |
| `ReservedBucketName`   | Union of reserved bucket names                        |
| `ValidateBuckets`      | Compile-time bucket name validator                    |
| `ReservedTagKey`       | Union of reserved tag keys                            |
| `ValidTagSchema`       | Compile-time tag schema constraint                    |

## TypeScript Requirements

- TypeScript 5.0+ required for `const` generic inference (bucket literal types)
- TypeScript 5.4+ recommended for `NoInfer` (bucket name compile-time validation)
- Target: ES2020
