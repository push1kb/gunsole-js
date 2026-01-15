# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gunsole SDK is a JavaScript/TypeScript logging and analytics SDK for browser and Node.js environments. It captures application logs, tracks user behavior, and monitors errors across web applications.

## Commands

```bash
# Build all packages
pnpm build

# Run all tests
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
pnpm --filter gunsole-js test        # Test SDK only
pnpm --filter gunsole-js test:watch  # Tests in watch mode
pnpm --filter gunsole-js dev         # Build SDK in watch mode

# Run test apps
cd apps/react-vite && pnpm dev
```

## Architecture

### Core Components (packages/gunsole-js/src/)

- **client.ts** - GunsoleClient class: main API for logging, user/session tracking, log batching, global error handler
- **transport.ts** - HTTP layer with retry logic (exponential backoff, max 3 retries)
- **config.ts** - Configuration validation and endpoint resolution by mode (cloud/desktop/local)
- **factory.ts** - `createGunsoleClient()` factory function
- **types.ts** - TypeScript type definitions
- **utils/env.ts** - Browser/Node.js environment detection
- **utils/time.ts** - Timestamp utilities

### Data Flow

```
App → GunsoleClient.log() → InternalLogEntry → Batch Array → Auto-flush (5s/10 logs) → Transport.sendBatch() → HTTP POST
```

### Configuration Modes

- `"cloud"`: https://api.gunsole.com
- `"desktop"`: http://localhost:8787
- `"local"`: http://localhost:17655

## Monorepo Structure

```
packages/gunsole-js/     # Main SDK (zero runtime dependencies)
apps/react-vite/         # React + Vite test app
apps/nextjs-app/         # Next.js test app
apps/solid-vite/         # Solid.js test app
apps/angular-app/        # Angular test app
```

## Key Patterns

- **Zero Dependencies**: SDK has no runtime dependencies - maintain this
- **Graceful Degradation**: All errors silently handled, never crashes host app
- **Batching**: Logs accumulated and sent in batches (default: 10 logs or 5s interval)
- **Retry**: Exponential backoff (1s, 2s, 4s delays)
- **Environment Detection**: Runtime platform detection for fetch implementation

## Code Style

- Biome for linting and formatting
- Line width: 80 characters
- Double quotes, 2-space indent, ES5 trailing commas
- TypeScript strict mode enabled
