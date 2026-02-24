# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gunsole SDK is a JavaScript/TypeScript logging and analytics SDK for browser and Node.js environments. It captures application logs, tracks user behavior, and monitors errors across web applications. Requires Node.js >=18 and pnpm >=8.

## Commands

```bash
# Build all packages (uses tsup → dual CJS/ESM output with dts)
pnpm build

# Run all tests (Vitest, node environment)
pnpm test

# Lint and format
pnpm lint              # Check with Biome
pnpm lint:fix          # Fix lint issues
pnpm format            # Format code
pnpm check             # Check lint + format
pnpm check:fix         # Fix all issues

# Type checking
pnpm typecheck

# SDK-specific commands
pnpm --filter @gunsole/core test            # Test SDK only
pnpm --filter @gunsole/core test:watch      # Tests in watch mode
pnpm --filter @gunsole/core test --coverage # Tests with v8 coverage
pnpm --filter @gunsole/core dev             # Build SDK in watch mode

# Run test apps
cd apps/react-vite && pnpm dev       # React + Vite
cd apps/nextjs-app && pnpm dev       # Next.js (App Router)
cd apps/solid-vite && pnpm dev       # Solid.js + Vite
cd apps/angular-app && pnpm start    # Angular
cd apps/log-blaster && pnpm start    # Node.js CLI stress-test tool
```

## Architecture

### Core Components (packages/core/src/)

- **client.ts** - `GunsoleClient<Tags>` class: main API for logging (`log()`, `info()`, `debug()`, `warn()`, `error()`), user/session tracking, log batching, global error handler, `destroy()` lifecycle method
- **transport.ts** - HTTP layer with retry logic (exponential backoff, max 3 retries), gzip compression via native Compression Streams API (disabled when `isDebug: true`)
- **config.ts** - Configuration validation and endpoint resolution by mode (cloud/desktop/local), supports custom `fetch` implementation
- **factory.ts** - `createGunsoleClient<Tags>()` factory function
- **types.ts** - TypeScript type definitions, `TagEntry<T>` generic for compile-time tag safety
- **utils/env.ts** - Browser/Node.js environment detection
- **utils/time.ts** - Timestamp utilities

### Data Flow

```
App → GunsoleClient.log() → InternalLogEntry → Batch Array → Auto-flush (5s/10 logs) → Transport.sendBatch() → gzip → HTTP POST to ${endpoint}/logs
```

### Configuration Modes

- `"cloud"`: https://api.gunsole.com
- `"desktop"`: http://localhost:8787
- `"local"`: http://localhost:17655

### Public Exports (src/index.ts)

`createGunsoleClient`, `GunsoleClient`, `GunsoleClientConfig`, `LogEntry`, `LogLevel`, `LogOptions`, `TagEntry`, `UserInfo`, `ClientMode`

Note: `InternalLogEntry` and `BatchPayload` are internal only (not exported).

## Monorepo Structure

```
packages/core/     # Main SDK (zero runtime dependencies)
apps/react-vite/         # React + Vite test app
apps/nextjs-app/         # Next.js test app
apps/solid-vite/         # Solid.js test app
apps/angular-app/        # Angular test app
apps/log-blaster/        # Node.js CLI stress-test (fires 100 logs across 10 buckets)
```

## Testing

- **Framework**: Vitest with node environment
- **Location**: `packages/core/tests/` (not co-located with source)
- **Coverage**: v8 provider, reporters: text/json/html
- **Mocks**: `tests/mocks.ts` provides `createMockGunsoleClient()` helper
- Tests are excluded from tsconfig (`"exclude": ["tests"]`) so they don't need to meet the same strict constraints

## Key Patterns

- **Graceful Degradation**: All errors silently handled, never crashes host app
- **Batching**: Logs accumulated and sent in batches (default: 10 logs or 5s interval)
- **Retry**: Exponential backoff (1s, 2s, 4s delays)
- **Gzip Compression**: Payloads compressed by default; `isDebug: true` disables compression for readability
- **Generic Tags**: `GunsoleClient<Tags>` accepts a type parameter for compile-time tag safety
- **Lifecycle**: Apps should call `destroy()` on teardown (stops flush timer, detaches error handlers, flushes remaining logs)

## Code Style

- Biome for linting and formatting (package-level config extends root)
- Line width: 80, double quotes, semicolons always, 2-space indent, ES5 trailing commas
- Arrow parentheses: always, line endings: LF, organize imports: enabled
- TypeScript strict mode + `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Target: ES2020
