import type { Migration } from './types';

const migration: Migration = {
	version: 8,
	description: 'Drop executionRest and executionSpeed stores',
	up(db) {
		if (db.objectStoreNames.contains('executionRest')) {
			db.deleteObjectStore('executionRest');
		}
		if (db.objectStoreNames.contains('executionSpeed')) {
			db.deleteObjectStore('executionSpeed');
		}
	},
};

export default migration;
