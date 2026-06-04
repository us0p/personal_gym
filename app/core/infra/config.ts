/**
 * The current IndexedDB schema version.
 *
 * This is the single source of truth for the database version.
 * It MUST equal the number of migration files registered in migrations/index.ts.
 *
 * When adding a new migration:
 *   1. Create `NNN-description.ts` in migrations/.
 *   2. Import it in migrations/index.ts.
 *   3. Increment DATABASE_VERSION here.
 *
 * The migrations/index.ts module validates this at load time and throws if the
 * values diverge, so mismatches are caught immediately during development and CI.
 */
const DATABASE_VERSION = 11 as const;

export { DATABASE_VERSION };
