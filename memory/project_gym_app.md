---
name: Personal Gym App structure
description: Architecture, DB schema, routes, design system for the client-side gym tracker
type: project
---

# Personal Gym — Architecture Overview

## Tech stack
- Next.js 16.2.1 (breaking changes vs older versions — always read `node_modules/next/dist/docs/` before writing code)
- React 19, TypeScript, Tailwind CSS v4
- IndexedDB via a custom `Database` singleton (`app/core/infra/database.ts`)
- Vitest + fake-indexeddb for unit tests
- pnpm package manager

## IndexedDB schema (v2, `app/core/infra/config.ts` → DATABASE_VERSION = 2)
| Store | keyPath | notes |
|---|---|---|
| `users` | `username` | single-user enforced at app layer via UserRepository |
| `workout` | `name` | includes `username: string` field |
| `exercise` | `name` | |
| `execution` | `id` (autoIncrement) | includes `username: string` field |

## Single-user enforcement (refactored 2026-04-03)
`UserRepository` (`app/core/entities/user/user-repository.ts`) wraps Database and enforces one user:
- `create(user)` — throws `UserAlreadyExistsError` if any user exists
- `get()` — returns the single user or undefined
- `update(user)` — throws `UserNotFoundError` if no user; throws if username changes
- `delete()` — silent no-op if no user
- `exists()` — boolean check

## Entity types
- `User` (`app/core/entities/user/user.ts`) — username, sex (SexOptions), age, weight, height
- `Workout` (`app/core/entities/workout/workout.ts`) — name, exercises[], **username**
- `Execution` (`app/core/entities/execution/execution.ts`) — id?, workoutName, exerciseName, repNumber, timestamp, **username**
- `Exercise` (`app/core/entities/exercise/exercise.ts`) — name, bodyRegion[], type

## Context
`UserProvider` (`app/context/user-context.tsx`) — loads the single user from DB on mount via UserRepository; exposes `{ user, refreshUser }`.

## Routes
| Path | Description |
|---|---|
| `/` | Home |
| `/users` | Profile page (single user) — shows create link if no user |
| `/users/new` | Create profile (redirects away if user already exists) |
| `/users/[username]` | Edit/delete profile |
| `/workouts` | List workouts |
| `/workouts/new` | Create workout (requires user; stores username) |
| `/workouts/[name]` | Edit workout |
| `/exercises` | List exercises |
| `/exercises/new` | Create exercise |
| `/exercises/[name]` | Edit exercise |
| `/executions` | List logged sets |
| `/executions/new` | Log a set (requires user; stores username) |
| `/login` | Legacy login page (old, superseded by /users flow) |

## Migration system
- `app/core/infra/migrations/` — each file exports a `Migration` with `version`, `description`, `up(db: IDBDatabase)`
- `DATABASE_VERSION` in `config.ts` must equal the number of registered migrations (enforced at import time)
- Test file: `app/core/infra/__tests__/database.test.ts`
- User repository tests: `app/core/entities/user/__tests__/user-repository.test.ts`

## Design system
Dark theme: `bg-black` page, `bg-zinc-900` cards, `text-white`. Nav fixed at bottom with 5 tabs.
