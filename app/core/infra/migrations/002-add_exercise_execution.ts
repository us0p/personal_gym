import type { Migration } from './types';

/**
 * Replaces the placeholder v1 stores (workoutGroup, set) with the real
 * exercise and execution stores described in the README schema.
 */
const migration: Migration = {
	version: 2,
	description: 'Replace legacy stores with exercise and execution',
	up(db) {
		if (db.objectStoreNames.contains('workoutGroup')) {
			db.deleteObjectStore('workoutGroup');
		}
		if (db.objectStoreNames.contains('set')) {
			db.deleteObjectStore('set');
		}

		db.createObjectStore('exercise', { keyPath: 'name' });
		db.createObjectStore('execution', { keyPath: 'id', autoIncrement: true });
	},
};

export default migration;
