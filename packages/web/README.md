# @gunsole/web

Browser-optimised wrapper around `@gunsole/core` with lifecycle management baked in.

## Installation

```bash
pnpm add @gunsole/web @gunsole/core
# or
npm install @gunsole/web @gunsole/core
# or
yarn add @gunsole/web @gunsole/core
```

## Usage

### Quick Start

```typescript
import { createGunsoleClient } from "@gunsole/web";

const gunsole = createGunsoleClient({
  projectId: "your-project-id",
  apiKey: "your-api-key",
  mode: "cloud",
  env: "production",
  appName: "my-app",
  appVersion: "1.0.0",
});

gunsole.log({ bucket: "user_action", message: "User clicked button" });
```

The web factory wraps `@gunsole/core` and automatically:

- Wraps `fetch` with `keepalive` support for reliable delivery
- Flushes remaining logs via `sendBeacon` on `pagehide`
- Flushes on visibility change and network reconnect
- Attaches global error handlers (`window.onerror`, `unhandledrejection`)
- Enables debug mode via URL param (`?__gunsole_debug=true`) or `localStorage`
- Cleans up everything on `destroy()`

### Session Persistence

Persist the session ID in a cookie so it survives page reloads:

```typescript
import { createGunsoleClient, persistSession } from "@gunsole/web";

const gunsole = createGunsoleClient({ projectId: "my-app", apiKey: "key", mode: "cloud" });
const sessionId = persistSession(gunsole);
```

### Lifecycle Options

Control which lifecycle behaviours are enabled:

```typescript
const gunsole = createGunsoleClient(
  { projectId: "my-app", apiKey: "key", mode: "cloud" },
  {
    sendBeacon: true,      // flush via sendBeacon on pagehide (default: true)
    networkAware: true,    // flush on online event (default: true)
    visibilityAware: true, // flush on visibilitychange (default: true)
    urlDebug: true,        // enable ?__gunsole_debug=true (default: true)
  }
);
```

### Low-Level Primitives

For advanced use cases, you can use the building blocks directly:

```typescript
import { createGunsoleClient } from "@gunsole/core";
import { attachWebLifecycle, createKeepaliveFetch } from "@gunsole/web";

const client = createGunsoleClient({
  projectId: "my-app",
  apiKey: "key",
  mode: "cloud",
  fetch: createKeepaliveFetch(),
});

const detach = attachWebLifecycle(client);

// Later:
detach();
await client.destroy();
```

## API

### `createGunsoleClient(config, lifecycleOptions?)`

Creates a `GunsoleClient` with all browser lifecycle features attached. Accepts the same config as `@gunsole/core` plus optional `WebLifecycleOptions`.

### `persistSession(client, cookieName?)`

Reads or writes the session ID to a cookie (`gunsole_session` by default). Returns the session ID string.

### `attachWebLifecycle(client, options?)`

Attaches browser lifecycle handlers to an existing `GunsoleClient`. Returns a `DetachFunction` to remove all listeners.

### `createKeepaliveFetch(baseFetch?)`

Wraps a fetch function to add `keepalive: true` when the body is under 51 KB (browser limit is 64 KB).

## Exports

All key types are re-exported from `@gunsole/core` so you only need `@gunsole/web` as an import:

```typescript
import type {
  ClientMode,
  GunsoleClientConfig,
  LogLevel,
  LogOptions,
  TagEntry,
  UserInfo,
} from "@gunsole/web";
```

## License

MIT
