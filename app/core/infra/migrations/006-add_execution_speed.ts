import type { Migration } from './types';

const migration: Migration = {
	version: 6,
	description: 'Add executionSpeed store for tracking exercise execution speeds',
	up(db) {
		db.createObjectStore('executionSpeed', { keyPath: 'id', autoIncrement: true });
	},
};

export default migration;
