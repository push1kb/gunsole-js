# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-07-15

### Added

- Live Widgets: `liveCard()`, `liveProgress()`, `liveTable()`, `liveChart()` client methods for driving live UI in Gunsole Desktop via `liveId`/`live`-tagged log entries
- `liveId` and `live` fields on `LogOptions` / `InternalLogEntry`, plus `LiveWidgetType`, `LiveWidgetPayload`, `LiveCardData`, `LiveProgressData`, `LiveTableData`, `LiveTableCell`, `LiveChartData`, and `LiveLogOptions` type exports
- Non-chart live updates (card/progress/table) coalesce with a pending entry sharing the same `liveId` before flush, and are exempt from rate limiting when they coalesce; `liveChart()` always appends and is always rate-limited
- `liveCard`, `liveProgress`, `liveTable`, `liveChart` added to the reserved bucket name list

### Potentially Breaking (type-level only)

- `ReservedTagKey` gained `"liveId"` and `"traceId"` (the latter closes a pre-existing gap where `traceId` was usable as a tag key despite colliding with the built-in field). Consumers with a tag schema that declares a `liveId` or `traceId` key will now fail the `ValidTagSchema` compile-time check. No runtime behavior changes.

## [0.2.0] - 2026-03-08

### Added

- `fatal()` log level for unrecoverable errors
- `drainBatch()` method to manually flush the log batch
- `projectId`, `apiKey`, `logEndpoint` read-only accessors on the client
- `isDisabled` config option to fully noop the SDK
- `apiKey` is now optional for `local` and `desktop` modes
- `FetchFunction` type export for custom fetch consumers
- Fetch timeout to prevent hanging requests

### Fixed

- `sessionId` generation in SSR environments
- Data loss on flush failure — logs are re-queued on failed sends
- OOM protection with batch size cap
- Thundering herd mitigation with jittered retry backoff

## [0.1.0] - 2026-02-23

### Added

- `GunsoleClient` with `log()`, `info()`, `debug()`, `warn()`, `error()` methods
- Typed bucket accessor methods with compile-time safety (`createGunsoleClient({ buckets: ["payment"] })`)
- Generic tag schema support for compile-time tag validation (`GunsoleClient<Tags>`)
- Automatic log batching (default: 10 logs or 5s interval)
- HTTP transport with retry logic and exponential backoff
- Gzip compression via native Compression Streams API (disabled in debug mode)
- User tracking (`setUser()`) and session tracking (`setSessionId()`)
- Global error handler integration (`attachGlobalErrorHandlers()`)
- Trace ID support for distributed tracing
- Three client modes: `cloud`, `desktop`, `local`
- Custom `fetch` implementation support
- Dual CJS/ESM builds with TypeScript declarations
- Zero runtime dependencies
