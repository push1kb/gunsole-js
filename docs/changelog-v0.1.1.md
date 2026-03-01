# Changelog — v0.1.1 Bug Fixes

All issues addressed on branch `push1kb/bug-fixes-v01`.

## Bug Fixes

### #1 — Data loss on flush failure (Critical)

**Problem:** `flush()` cleared the batch array *before* `sendBatch()` succeeded. If all retries failed, the logs in that batch were permanently lost.

**Fix:**
- Moved `logsToSend` and the empty check before the `try` block in `client.ts:flush()`.
- On catch, failed logs are re-queued to the front of the batch via `this.batch.unshift(...logsToSend)`.
- `transport.ts:sendBatch()` now throws after all retries are exhausted (previously it silently resolved), so `flush()` can distinguish success from failure.
- 4xx client errors (except 429) return without throwing — they aren't retryable.

**Files:** `packages/core/src/client.ts`, `packages/core/src/transport.ts`

---

### #5 — No fetch timeout (High)

**Problem:** No `AbortController` or timeout was used on fetch calls. A slow or unresponsive server would hang requests indefinitely, stalling the entire retry loop.

**Fix:**
- Added `REQUEST_TIMEOUT_MS = 30_000` constant.
- Each fetch call is wrapped with an `AbortController` and a 30-second `setTimeout` that calls `controller.abort()`.
- `clearTimeout` in a `finally` block prevents timer leaks.
- Aborted requests are treated as network errors and trigger the existing retry logic.

**Files:** `packages/core/src/transport.ts`

---

### #12 — No destroyed state guard (Medium)

**Problem:** After `destroy()` was called, `log()` still queued logs into the batch. These logs would never be flushed since the timer was stopped.

**Fix:**
- Added a `destroyed` boolean flag to `GunsoleClient`.
- After `destroy()`, `log()`, `info()`, `debug()`, `warn()`, `error()`, `setUser()`, and `setSessionId()` all no-op.
- `destroy()` is idempotent — calling it multiple times is safe.
- `destroy()` clears `user` and `sessionId` internally before marking as destroyed.

**Files:** `packages/core/src/client.ts`

---

### #6 — No validation of batchSize or flushInterval (High)

**Problem:** `normalizeConfig()` did not validate that `batchSize > 0` or `flushInterval > 0`. A `batchSize: 0` would flush on every log call, and `flushInterval: 0` would create a runaway `setInterval`.

**Fix:**
- `normalizeConfig()` now throws if `batchSize < 1` or `flushInterval < 100ms`.

**Files:** `packages/core/src/config.ts`

---

### #4 — README log() example is incorrect (Critical)

**Problem:** The README showed `level` as a field inside `LogOptions`, but `level` is not part of `LogOptions` — it's the first argument to `log()`.

**Fix:**
- First example uses single-arg form: `gunsole.log({ bucket, message })` (defaults to info).
- Second example uses two-arg form: `gunsole.log("error", { bucket, message, context, tags })`.

**Files:** `packages/core/README.md`

---

## Enhancements

### #15 — Remove unused LogEntry export

**Problem:** `LogEntry` was exported from `index.ts` but never used anywhere in source or tests.

**Fix:** Removed `LogEntry` interface from `types.ts` and its export from `index.ts`.

**Files:** `packages/core/src/types.ts`, `packages/core/src/index.ts`

---

### #16 — Remove dead createMockGunsoleClient helper

**Problem:** `createMockGunsoleClient()` in `tests/mocks.ts` was never imported by any test file.

**Fix:** Deleted `tests/mocks.ts`.

**Files:** `packages/core/tests/mocks.ts` (deleted)

---

### #13 — Hardcoded error handler bucket names undocumented

**Problem:** Global error handlers used hardcoded bucket names (`unhandled_rejection`, `global_error`, `uncaught_exception`) that were not documented anywhere.

**Fix:** Added documentation in the README under "Global Error Handlers" listing all three built-in bucket names and which environments they apply to.

**Files:** `packages/core/README.md`

---

### #11 — No way to clear user or session

**Problem:** `setUser()` and `setSessionId()` existed but there was no way to clear them.

**Fix:** `destroy()` now clears `user` and `sessionId` internally. No public clear API was added — these are implementation details that get cleaned up on teardown.

**Files:** `packages/core/src/client.ts`

---

### #10 — README missing documentation for buckets and fetch options

**Problem:** The Options table omitted `buckets` and `fetch` config properties. Also originally mentioned `isDebug` which no longer exists.

**Fix:**
- Added `buckets` and `fetch` to the Options list in the README.
- Updated issue title to remove `isDebug` reference (config option was removed in prior work).

**Files:** `packages/core/README.md`

---

### #8 — Add engines field to SDK package.json

**Problem:** The SDK requires Node.js 18+ for native `fetch` and Compression Streams API, but the published package had no `engines` field.

**Fix:** Added `"engines": { "node": ">=18.0.0" }` to `packages/core/package.json`.

**Files:** `packages/core/package.json`

---

### #9 — No tests for gzip compression path (Closed as irrelevant)

**Problem:** All tests previously used `isDebug: true`, which disabled compression.

**Resolution:** `isDebug` was removed from the transport in prior work on this branch. All tests now go through the gzip path and decompress with `gunzip()` to verify payloads. Closed without changes.

---

## Other Changes on This Branch

- Removed `isDebug` from `Transport` constructor — compression is always enabled.
- Switched bare `.js` import extensions to extensionless imports across source and tests.
- Used `isDev()` helper consistently for dev-only `console.warn` calls.
- Updated `LICENSE` copyright year to 2026.
- Added `publishConfig.access`, `homepage`, and TypeScript `peerDependencies` to `package.json`.

## Test Summary

- **49 tests passing** across 4 test files
- TypeScript typecheck clean
- New tests added for: log re-queuing on flush failure, AbortSignal on fetch, destroyed state guard, batchSize/flushInterval validation
