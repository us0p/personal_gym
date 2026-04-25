import type { Migration } from './types';

const migration: Migration = {
	version: 9,
	description: 'Add userStrike store',
	up(db) {
		if (!db.objectStoreNames.contains('userStrike')) {
			db.createObjectStore('userStrike', { keyPath: 'username' });
		}
	},
};

export default migration;
