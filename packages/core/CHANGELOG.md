# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
