import { DATABASE_VERSION } from '../config';
import migration001 from './001-initial_schema';
import migration002 from './002-add_exercise_execution';
import migration003 from './003-add_user_weight_progression';
import migration004 from './004-add_execution_rest';
import migration005 from './005-backfill_username';
import migration006 from './006-add_execution_speed';
import migration007 from './007-remove_workout_name_from_execution_rest';
import migration008 from './008-remove_execution_rest_and_speed_stores';
import migration009 from './009-add_user_strike';
import migration010 from './010-migrate_workout_exercises';
import migration011 from './011-add_exercise_note';
import type { Migration } from './types';

/**
 * All registered migrations, sorted by version number.
 *
 * To add a new migration:
 *   1. Create `NNN-description.ts` in this folder exporting a Migration.
 *   2. Import it here and add it to the array below.
 *   3. Bump DATABASE_VERSION in config.ts.
 *
 * The invariant check below will throw immediately if DATABASE_VERSION and the
 * number of registered migrations disagree, catching the mistake before it
 * reaches a real or test database.
 */
const migrations: Migration[] = [
	migration001,
	migration002,
	migration003,
	migration004,
	migration005,
	migration006,
	migration007,
	migration008,
	migration009,
	migration010,
	migration011,
].sort((a, b) => a.version - b.version);

if (migrations.length !== DATABASE_VERSION) {
	throw new Error(
		`DATABASE_VERSION mismatch: config.ts declares version ${DATABASE_VERSION} ` +
		`but ${migrations.length} migration(s) are registered in migrations/index.ts. ` +
		`Update both files together.`,
	);
}

export { migrations };
export type { Migration };
