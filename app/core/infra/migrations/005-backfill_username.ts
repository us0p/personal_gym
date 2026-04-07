import type { Migration } from './types';

/**
 * Backfills the `username` field on `workout`, `execution`, and
 * `userWeightProgression` records that were created before the single-user
 * enforcement refactor added the field to those stores.
 *
 * Strategy: read the single user from the `users` store (this is a
 * single-user app), then iterate each affected store and `put` back any
 * record that is missing the field.  Records that already carry a `username`
 * value are left untouched.  If no user exists yet the migration is a no-op.
 */
const migration: Migration = {
	version: 5,
	description: 'Backfill username on workout, execution, and userWeightProgression records',

	up(_db: IDBDatabase, tx: IDBTransaction) {
		const usersReq = tx.objectStore('users').getAll();

		usersReq.onsuccess = () => {
			const users = usersReq.result as Array<{ username: string }>;
			if (!users.length) return;
			const { username } = users[0];

			const stores = ['workout', 'execution', 'userWeightProgression'] as const;

			for (const storeName of stores) {
				const store = tx.objectStore(storeName);
				const req = store.getAll();
				req.onsuccess = () => {
					for (const record of req.result as Array<Record<string, unknown>>) {
						if (!record.username) {
							store.put({ ...record, username });
						}
					}
				};
			}
		};
	},
};

export default migration;
