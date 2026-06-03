# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev            # start dev server
pnpm build          # production build
pnpm lint           # ESLint
pnpm test           # run all tests once
pnpm test:watch     # watch mode
pnpm test:coverage  # coverage report
```

Run a single test file:
```bash
pnpm test app/core/entities/execution/__tests__/execution-repository.test.ts
```

## Architecture

This is a **client-side-only PWA** — there is no backend. All data lives in IndexedDB in the browser. Pages use `'use client'` and access the database directly.

### Layers

**`app/core/`** — domain layer, framework-agnostic:
- `entities/<domain>/` — entity types and `*Repository` classes that wrap `Database`
- `infra/database.ts` — IndexedDB singleton (`Database.getInstance()` for app code, `Database.createInstance(factory)` for tests)
- `infra/config.ts` — `DATABASE_VERSION` (single source of truth for schema version)
- `infra/migrations/` — ordered migration files; `index.ts` validates that the number of registered migrations equals `DATABASE_VERSION` at load time

**`app/context/`** — React contexts providing global state:
- `UserContext` — currently logged-in user and weight
- `TimerContext` — rest timer with Web Audio API beep; active exercise persisted to `sessionStorage`
- `LocaleContext` — i18n locale switcher
- `ToastContext` — toast notifications via `react-hot-toast`

**`app/i18n/translations.ts`** — translation keys for `en` and `pt-BR`; interpolation uses `{placeholder}` syntax.

**`app/lib/styles.ts`** — shared Tailwind class strings.

### Adding a migration

1. Create `app/core/infra/migrations/NNN-description.ts` exporting a `Migration` object.
2. Import and register it in `migrations/index.ts`.
3. Increment `DATABASE_VERSION` in `config.ts`.

The invariant check in `migrations/index.ts` will throw immediately at load time if these get out of sync.

### Testing

Tests live in `__tests__/` subdirectories alongside the code they test. The test environment is `node` (not jsdom). IndexedDB is provided by `fake-indexeddb`:

```ts
import IDBFactory from 'fake-indexeddb/lib/FDBFactory';
const db = await Database.createInstance(new IDBFactory());
```

Each test should create its own isolated `Database` instance — do not use `Database.getInstance()` in tests.

### PWA / Service Worker

`public/sw.js` is the service worker (static, not generated). `next.config.ts` sets no-cache headers for it. `app/components/sw-register.tsx` handles registration on mount.
