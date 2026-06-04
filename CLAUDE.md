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
- `services/` — domain services that orchestrate repositories; all business logic that spans multiple entities lives here
- `infra/database.ts` — IndexedDB singleton (`Database.getInstance()` for app code, `Database.createInstance(factory)` for tests)
- `infra/config.ts` — `DATABASE_VERSION` (single source of truth for schema version)
- `infra/migrations/` — ordered migration files; `index.ts` validates that the number of registered migrations equals `DATABASE_VERSION` at load time

**`app/context/`** — React contexts providing global state:
- `UserContext` — currently logged-in user and weight
- `TimerContext` — rest timer with Web Audio API beep; delegates sessionStorage and countdown math to `TimerService`
- `LocaleContext` — i18n locale switcher; locale is derived from `user.locale` with no `useEffect` side effect
- `ToastContext` — toast notifications via `react-hot-toast`

**`app/i18n/translations.ts`** — translation keys for `en` and `pt-BR`; interpolation uses `{placeholder}` syntax.

**`app/lib/styles.ts`** — shared Tailwind class strings.

### Service layer (`app/core/services/`)

Every service takes `Database` in its constructor and uses repositories internally. Pages instantiate services inline — no DI container.

| Service | Responsibility |
|---|---|
| `TimerService` | Countdown math, sessionStorage read/write for active exercise |
| `ExerciseService` | Rename exercise with cascade to workouts + executions; delete |
| `WorkoutService` | Update/rename workout with cascade to executions; delete |
| `DataPortService` | Export all IndexedDB stores to JSON; import from JSON |
| `ExecutionLogService` | Log a completed set + record workout streak |
| `ExerciseProgressionService` | Exercise names from workouts, metric detection, chart time-series |

**Rule:** pages must not contain business logic. If a page handler does more than call a service and update UI state, extract it.

### ExerciseRepository

`app/core/entities/exercise/exercise-repository.ts` — CRUD wrapper for the `exercise` store. Use it in pages instead of calling `db.getAll('exercise')` directly.

### Shared workout hook

`app/workouts/use-workout-exercise-selector.ts` — manages `Map<string, ExerciseMetric[]>` state with `toggleExercise`, `toggleMetric`, `setExercises`, and `getWorkoutExercises`. Used by both `workouts/new` and `workouts/[name]/edit`.

### IndexedDB stores (current schema, version 10)

| Store | Key | Description |
|---|---|---|
| `users` | `username` | Single user profile |
| `workout` | `name` | Workout definitions |
| `exercise` | `name` | Exercise definitions |
| `execution` | `id` (auto) | Logged sets |
| `userWeightProgression` | `id` (auto) | Weight entries |
| `userStrike` | `username` | Workout streak data |

`DataPortService.exportAll()` covers all six stores. The previous page-level export was missing `userStrike`.

### Database schema

The full ERM and store reference live in **[DATABASE.md](./DATABASE.md)**.

**Always update `DATABASE.md` when you:**
- Add or remove a store (migration)
- Add, rename, or remove a field on any entity
- Change a relationship or cascade rule
- Change an allowed value set (e.g. `ExerciseType`, `ExerciseMetric`)

### Adding a migration

1. Create `app/core/infra/migrations/NNN-description.ts` exporting a `Migration` object.
2. Import and register it in `migrations/index.ts`.
3. Increment `DATABASE_VERSION` in `config.ts`.
4. **Update `DATABASE.md`** — ERM, stores table, and migration history table.

The invariant check in `migrations/index.ts` will throw immediately at load time if these get out of sync.

### Testing

Tests live in `__tests__/` subdirectories alongside the code they test. The test environment is `node` (not jsdom). IndexedDB is provided by `fake-indexeddb`:

```ts
import { IDBFactory } from 'fake-indexeddb';
const db = await Database.createInstance(new IDBFactory());
```

Each test should create its own isolated `Database` instance — do not use `Database.getInstance()` in tests. Always call `db.close()` in `afterEach`.

Service tests follow the same pattern: create a fresh `Database`, instantiate the service and any supporting repositories, write assertions.

### ESLint rules to watch

- `react-hooks/set-state-in-effect` — do not call `setState` synchronously in `useEffect`. Use lazy initialisers (`useState(() => ...)`) for hydration from storage; for async data loading, define the async function *inside* the effect body and call it with `void`.
- `react-hooks/refs` — do not read `ref.current` during render. Store stable service instances with `useState(() => new Service())` instead of `useRef`.

### PWA / Service Worker

`public/sw.js` is the service worker (static, not generated). `next.config.ts` sets no-cache headers for it. `app/components/sw-register.tsx` handles registration on mount.
