# Database Schema

> **Keep this file in sync with the code.**
> Update it every time you add a migration, rename a field, or change a relationship.
> The source of truth for the schema version is `app/core/infra/config.ts` (`DATABASE_VERSION`).

Current schema version: **10**

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        string  username    PK
        string  sex         "MALE | FEMALE"
        string  birthDate   "ISO date string"
        number  height      "cm"
        string  locale      "optional; e.g. en, pt-BR"
    }

    Exercise {
        string   name        PK
        string   type        "push | pull | static | cardio"
        string[] bodyRegion  "subset of BODY_REGIONS_BY_TYPE[type]"
    }

    Workout {
        string   name       PK
        string   username   FK
        string[] weekDays   "optional; MONDAY..SUNDAY"
    }

    WorkoutExercise {
        string   name     "references Exercise.name (not enforced)"
        string[] metrics  "reps | weight | time | duration | distance"
    }

    Execution {
        number  id            PK "auto-increment"
        string  username      FK
        string  workoutName   "references Workout.name (not enforced)"
        string  exerciseName  "references Exercise.name (not enforced)"
        string  timestamp     "ISO datetime string"
        number  repNumber     "optional — present when metric=reps"
        number  weightKg      "optional — present when metric=weight"
        number  durationMin   "optional — present when metric=duration (cardio)"
        number  durationSec   "optional — present when metric=time (static)"
        number  distanceKm    "optional — present when metric=distance"
    }

    UserWeightEntry {
        number  id         PK "auto-increment"
        string  username   FK
        number  weight     "kg"
        string  createdAt  "ISO datetime string"
    }

    UserStrike {
        string  username      PK "same as FK → User"
        number  strikeCount   "current consecutive-day streak"
        number  maxStrike     "all-time best streak"
        string  updatedAt     "ISO datetime string"
    }

    User          ||--o{  Workout         : "owns (username)"
    User          ||--o{  Execution       : "logs (username)"
    User          ||--o{  UserWeightEntry : "tracks (username)"
    User          ||--o|  UserStrike      : "has (username)"
    Workout       ||--|{  WorkoutExercise : "embeds (exercises[])"
    WorkoutExercise }o--o| Exercise       : "references name"
    Execution     }o--o|  Workout         : "references workoutName"
    Execution     }o--o|  Exercise        : "references exerciseName"
```

---

## Stores reference

| Store | IndexedDB key | Auto-increment | Notes |
|---|---|---|---|
| `users` | `username` | no | Single user per installation |
| `workout` | `name` | no | |
| `exercise` | `name` | no | |
| `execution` | `id` | **yes** | Append-only log |
| `userWeightProgression` | `id` | **yes** | Append-only log |
| `userStrike` | `username` | no | One record per user |

---

## Relationship rules

IndexedDB enforces no foreign keys. Consistency is maintained by the service layer:

- **Renaming an exercise** → `ExerciseService.rename()` cascades to `workout.exercises[].name` and `execution.exerciseName`.
- **Renaming a workout** → `WorkoutService.update()` cascades to `execution.workoutName`.
- **Deleting an exercise or workout** → references in other stores become dangling (no cascade delete by design).

---

## Embedded objects

`Workout.exercises` is stored as a JSON array of `WorkoutExercise` objects directly inside the workout record — it is **not** a separate store.

```ts
interface WorkoutExercise {
  name: string;          // matches Exercise.name
  metrics: ExerciseMetric[];  // subset of METRICS_BY_TYPE[exercise.type]
}
```

Allowed metrics per exercise type (see `METRICS_BY_TYPE` in `app/core/entities/exercise/exercise.ts`):

| Type | Allowed metrics |
|---|---|
| `push` | `reps`, `weight` |
| `pull` | `reps`, `weight` |
| `static` | `time`, `weight` |
| `cardio` | `duration`, `distance` |

---

## Migration history

| Version | File | Change |
|---|---|---|
| 1 | `001-initial_schema.ts` | Create `users`, `workout` (+ legacy `workoutGroup`, `set`) |
| 2 | `002-add_exercise_execution.ts` | Remove legacy stores; add `exercise`, `execution` |
| 3 | `003-add_user_weight_progression.ts` | Add `userWeightProgression` |
| 4 | `004-add_execution_rest.ts` | Add `executionRest` (later removed) |
| 5 | `005-backfill_username.ts` | Backfill `username` field on existing records |
| 6 | `006-add_execution_speed.ts` | Add `executionSpeed` (later removed) |
| 7 | `007-remove_workout_name_from_execution_rest.ts` | Drop `workoutName` from `executionRest` records |
| 8 | `008-remove_execution_rest_and_speed_stores.ts` | Drop `executionRest` and `executionSpeed` stores |
| 9 | `009-add_user_strike.ts` | Add `userStrike` |
| 10 | `010-migrate_workout_exercises.ts` | Migrate `workout.exercises` from `string[]` to `WorkoutExercise[]` |
