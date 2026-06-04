import type { Migration } from './types';

const migration: Migration = {
	version: 11,
	description: 'Add exerciseNote store',
	up(db) {
		if (!db.objectStoreNames.contains('exerciseNote')) {
			db.createObjectStore('exerciseNote', { keyPath: 'id', autoIncrement: true });
		}
	},
};

export default migration;
