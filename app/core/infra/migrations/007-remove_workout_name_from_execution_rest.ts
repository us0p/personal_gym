import type { Migration } from './types';

const migration: Migration = {
	version: 7,
	description: 'Remove workoutName field from executionRest records',
	up(_db: IDBDatabase, tx: IDBTransaction) {
		const store = tx.objectStore('executionRest');
		const req = store.getAll();
		req.onsuccess = () => {
			for (const record of req.result as Array<Record<string, unknown>>) {
				if ('workoutName' in record) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { workoutName: _removed, ...rest } = record;
					store.put(rest);
				}
			}
		};
	},
};

export default migration;
