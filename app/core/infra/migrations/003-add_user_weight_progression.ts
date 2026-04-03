import type { Migration } from './types';

const migration: Migration = {
	version: 3,
	description: 'Add userWeightProgression store for tracking weight over time',
	up(db) {
		const store = db.createObjectStore('userWeightProgression', { keyPath: 'id', autoIncrement: true });
		store.createIndex('by_username', 'username');
	},
};

export default migration;
