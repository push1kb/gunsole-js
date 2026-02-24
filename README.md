# Gunsole SDK - JavaScript/TypeScript Monorepo

This monorepo contains the Gunsole JavaScript SDK and test applications for various frameworks.

**Repository**: [https://github.com/push1kb/gunsole-js](https://github.com/push1kb/gunsole-js)

## Structure

```
.
├── packages/
│   └── core/                # Main SDK package (@gunsole/core)
└── apps/
    ├── react-vite/          # React + Vite test app
    ├── solid-vite/          # Solid + Vite test app
    ├── nextjs-app/          # Next.js test app
    └── angular-app/         # Angular test app
```

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Build the SDK

```bash
pnpm build
```

This builds the `@gunsole/core` package which is then used by all test apps via the workspace protocol.

## Test Applications

Each test app demonstrates the Gunsole SDK integration with different frameworks:

### React + Vite

```bash
cd apps/react-vite
pnpm dev
```

Visit `http://localhost:5173`

### Solid + Vite

```bash
cd apps/solid-vite
pnpm dev
```

Visit `http://localhost:5173`

### Next.js

```bash
cd apps/nextjs-app
pnpm dev
```

Visit `http://localhost:3000`

### Angular

```bash
cd apps/angular-app
pnpm start
```

Visit `http://localhost:4200`

## Features Tested

Each test app includes:

- ✅ Logging with different levels (info, debug, warn, error)
- ✅ Counter with automatic logging
- ✅ User and session tracking
- ✅ Manual log flushing
- ✅ Error logging
- ✅ Global error handlers (browser + Node.js)

## Development

### Build SDK

```bash
pnpm --filter @gunsole/core build
```

### Run Tests

```bash
pnpm --filter @gunsole/core test
```

### Lint and Format

```bash
# Check for issues
pnpm check

# Fix issues automatically
pnpm check:fix

# Or run separately
pnpm lint        # Lint only
pnpm lint:fix    # Lint and fix
pnpm format      # Format only
```

## Configuration

All test apps are configured to use:

- **Mode**: `local` (connects to `http://localhost:8787`)
- **Project ID**: `test-project-{framework}`
- **API Key**: `test-api-key`

To test with different endpoints, modify the `createGunsoleClient` configuration in each app's main component.

## License

MIT

Copyright (c) 2025 [@push1kb](https://github.com/push1kb)
