import type { Migration } from './types';

const migration: Migration = {
	version: 4,
	description: 'Add executionRest store for tracking rest periods between sets',
	up(db) {
		const store = db.createObjectStore('executionRest', { keyPath: 'id', autoIncrement: true });
		store.createIndex('by_executionId', 'executionId');
	},
};

export default migration;
