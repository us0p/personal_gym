import type { Migration } from './types';

const migration: Migration = {
	version: 13,
	description: 'Add workoutConfig store',
	up(db) {
		if (!db.objectStoreNames.contains('workoutConfig')) {
			db.createObjectStore('workoutConfig', { keyPath: 'username' });
		}
	},
};

export default migration;
