import type { Migration } from './types';

const migration: Migration = {
	version: 1,
	description: 'Initial schema',
	up(db) {
		db.createObjectStore('users', { keyPath: 'username' });
		db.createObjectStore('workout', { keyPath: 'name' });
		db.createObjectStore('workoutGroup', { keyPath: 'name' });
		db.createObjectStore('set', { keyPath: 'id', autoIncrement: true });
	},
};

export default migration;
