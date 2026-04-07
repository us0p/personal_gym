import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database, { DBError } from '../database';
import { migrations } from '../migrations';
import { DATABASE_VERSION } from '../config';

// Each test gets its own IDBFactory so there is no shared state between tests.
let factory: IDBFactory;

beforeEach(() => {
	factory = new IDBFactory();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function storeExists(db: Database, storeName: string): Promise<boolean> {
	try {
		await db.getAll(storeName);
		return true;
	} catch {
		return false;
	}
}

// ─── Static config ───────────────────────────────────────────────────────────

describe('config', () => {
	it('DATABASE_VERSION is a positive integer', () => {
		expect(Number.isInteger(DATABASE_VERSION)).toBe(true);
		expect(DATABASE_VERSION).toBeGreaterThan(0);
	});

	it('DATABASE_VERSION matches the version of the last registered migration', () => {
		const last = migrations[migrations.length - 1];
		expect(last.version).toBe(DATABASE_VERSION);
	});

	it('mismatch guard is active — this file loaded, so config and registry agree', () => {
		// migrations/index.ts throws at module load time when
		// migrations.length !== DATABASE_VERSION.
		// Reaching this line proves the guard passed; if it had thrown,
		// the entire test module would have failed to import.
		expect(migrations.length).toBe(DATABASE_VERSION);
	});
});

// ─── Migration registry ──────────────────────────────────────────────────────

describe('migrations registry', () => {
	it('Database.latestVersion reflects DATABASE_VERSION', () => {
		expect(Database.latestVersion).toBe(DATABASE_VERSION);
	});

	it('migrations are sorted in ascending version order', () => {
		for (let i = 1; i < migrations.length; i++) {
			expect(migrations[i].version).toBeGreaterThan(migrations[i - 1].version);
		}
	});

	it('each migration has a version, description, and up() function', () => {
		for (const m of migrations) {
			expect(typeof m.version).toBe('number');
			expect(m.version).toBeGreaterThan(0);
			expect(typeof m.description).toBe('string');
			expect(m.description.length).toBeGreaterThan(0);
			expect(typeof m.up).toBe('function');
		}
	});
});

// ─── Schema — fresh install ──────────────────────────────────────────────────

describe('fresh install (v0 → latest)', () => {
	it('creates all required stores', async () => {
		const db = await Database.createInstance(factory);

		for (const store of ['users', 'workout', 'exercise', 'execution', 'userWeightProgression', 'executionRest', 'executionSpeed']) {
			expect(await storeExists(db, store)).toBe(true);
		}

		db.close();
	});

	it('does NOT create legacy v1 stores', async () => {
		const db = await Database.createInstance(factory);

		for (const store of ['workoutGroup', 'set']) {
			expect(await storeExists(db, store)).toBe(false);
		}

		db.close();
	});

	it('opening the same factory twice at the same version succeeds', async () => {
		const db1 = await Database.createInstance(factory);
		db1.close();

		const db2 = await Database.createInstance(factory);
		expect(await storeExists(db2, 'users')).toBe(true);
		db2.close();
	});
});

// ─── Migrations — incremental upgrades ──────────────────────────────────────

describe('incremental migrations', () => {
	it('migration 001 creates the v1 stores', async () => {
		const db = await Database.createInstance(factory, 1);

		for (const store of ['users', 'workout', 'workoutGroup', 'set']) {
			expect(await storeExists(db, store)).toBe(true);
		}
		// exercise and execution do not exist yet
		expect(await storeExists(db, 'exercise')).toBe(false);
		expect(await storeExists(db, 'execution')).toBe(false);

		db.close();
	});

	it('migration 002 removes legacy stores and adds exercise + execution', async () => {
		// Simulate an existing client at v1
		const dbV1 = await Database.createInstance(factory, 1);
		dbV1.close();

		// Upgrade the same database to v2
		const dbV2 = await Database.createInstance(factory, 2);

		expect(await storeExists(dbV2, 'workoutGroup')).toBe(false);
		expect(await storeExists(dbV2, 'set')).toBe(false);
		expect(await storeExists(dbV2, 'exercise')).toBe(true);
		expect(await storeExists(dbV2, 'execution')).toBe(true);

		// v1 stores that should survive
		expect(await storeExists(dbV2, 'users')).toBe(true);
		expect(await storeExists(dbV2, 'workout')).toBe(true);

		dbV2.close();
	});

	it('a client that skips v1 and opens directly at v2 gets all stores', async () => {
		// Simulates a brand-new install where the app is already at v2
		const db = await Database.createInstance(factory, 2);

		for (const store of ['users', 'workout', 'exercise', 'execution']) {
			expect(await storeExists(db, store)).toBe(true);
		}
		expect(await storeExists(db, 'workoutGroup')).toBe(false);
		expect(await storeExists(db, 'set')).toBe(false);

		db.close();
	});

	it('upgrading from v1 to latest applies only the missing migrations', async () => {
		// Open at v1
		const dbV1 = await Database.createInstance(factory, 1);
		// Seed a user so we can verify data survives the migration
		await dbV1.add('users', { username: 'alice', sex: 'FEMALE', age: 28, weight: 60, height: 165 });
		dbV1.close();

		// Open at latest
		const dbLatest = await Database.createInstance(factory);

		// Data must be preserved
		const user = await dbLatest.get<{ username: string }>('users', 'alice');
		expect(user?.username).toBe('alice');

		// New stores must exist
		expect(await storeExists(dbLatest, 'exercise')).toBe(true);
		expect(await storeExists(dbLatest, 'execution')).toBe(true);
		expect(await storeExists(dbLatest, 'userWeightProgression')).toBe(true);

		dbLatest.close();
	});

	it('migration 003 adds userWeightProgression store', async () => {
		// Simulate a client already at v2
		const dbV2 = await Database.createInstance(factory, 2);
		expect(await storeExists(dbV2, 'userWeightProgression')).toBe(false);
		dbV2.close();

		// Upgrade to v3
		const dbV3 = await Database.createInstance(factory, 3);
		expect(await storeExists(dbV3, 'userWeightProgression')).toBe(true);

		// All prior stores must survive
		for (const store of ['users', 'workout', 'exercise', 'execution']) {
			expect(await storeExists(dbV3, store)).toBe(true);
		}

		dbV3.close();
	});

	it('migration 004 adds executionRest store', async () => {
		const dbV3 = await Database.createInstance(factory, 3);
		expect(await storeExists(dbV3, 'executionRest')).toBe(false);
		dbV3.close();

		const dbV4 = await Database.createInstance(factory, 4);
		expect(await storeExists(dbV4, 'executionRest')).toBe(true);

		for (const store of ['users', 'workout', 'exercise', 'execution', 'userWeightProgression']) {
			expect(await storeExists(dbV4, store)).toBe(true);
		}

		dbV4.close();
	});

	it('migration 005 backfills username on records that are missing the field', async () => {
		const dbV4 = await Database.createInstance(factory, 4);
		await dbV4.add('users', { username: 'alice', sex: 'FEMALE', birthDate: new Date('2000-01-01'), height: 165 });
		await dbV4.add('workout', { name: 'Push Day', exercises: ['Bench Press'] }); // no username
		await dbV4.add('execution', { workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 10, timestamp: new Date().toISOString() }); // no username
		await dbV4.add('userWeightProgression', { createdAt: new Date('2026-01-01'), weight: 70 }); // no username
		dbV4.close();

		const dbV5 = await Database.createInstance(factory, 5);

		const [workout] = await dbV5.getAll<{ username?: string }>('workout');
		expect(workout.username).toBe('alice');

		const [execution] = await dbV5.getAll<{ username?: string }>('execution');
		expect(execution.username).toBe('alice');

		const [weightEntry] = await dbV5.getAll<{ username?: string }>('userWeightProgression');
		expect(weightEntry.username).toBe('alice');

		dbV5.close();
	});

	it('migration 005 does not overwrite records that already have a username', async () => {
		const dbV4 = await Database.createInstance(factory, 4);
		await dbV4.add('users', { username: 'alice', sex: 'FEMALE', birthDate: new Date('2000-01-01'), height: 165 });
		await dbV4.add('workout', { name: 'Push Day', exercises: [], username: 'alice' });
		await dbV4.add('execution', { workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 5, timestamp: new Date().toISOString(), username: 'alice' });
		dbV4.close();

		const dbV5 = await Database.createInstance(factory, 5);

		const [workout] = await dbV5.getAll<{ username?: string }>('workout');
		expect(workout.username).toBe('alice');

		const [execution] = await dbV5.getAll<{ username?: string }>('execution');
		expect(execution.username).toBe('alice');

		dbV5.close();
	});

	it('migration 006 adds executionSpeed store', async () => {
		const dbV5 = await Database.createInstance(factory, 5);
		expect(await storeExists(dbV5, 'executionSpeed')).toBe(false);
		dbV5.close();

		const dbV6 = await Database.createInstance(factory, 6);
		expect(await storeExists(dbV6, 'executionSpeed')).toBe(true);

		for (const store of ['users', 'workout', 'exercise', 'execution', 'userWeightProgression', 'executionRest']) {
			expect(await storeExists(dbV6, store)).toBe(true);
		}

		dbV6.close();
	});

	it('migration 007 removes the workoutName field from existing executionRest records', async () => {
		const dbV6 = await Database.createInstance(factory, 6);
		await dbV6.add('executionRest', { executionId: 1, workoutName: 'Push Day', timestamp: '2026-01-01T00:00:00.000Z', durationSeconds: 90 });
		await dbV6.add('executionRest', { executionId: 2, workoutName: 'Leg Day', timestamp: '2026-01-02T00:00:00.000Z', durationSeconds: 60 });
		dbV6.close();

		const dbV7 = await Database.createInstance(factory, 7);
		const records = await dbV7.getAll<Record<string, unknown>>('executionRest');
		expect(records).toHaveLength(2);
		for (const record of records) {
			expect(record).not.toHaveProperty('workoutName');
			expect(record).toHaveProperty('executionId');
			expect(record).toHaveProperty('durationSeconds');
		}
		dbV7.close();
	});

	it('migration 007 is a no-op when executionRest has no records with workoutName', async () => {
		const dbV6 = await Database.createInstance(factory, 6);
		await dbV6.add('executionRest', { executionId: 1, timestamp: '2026-01-01T00:00:00.000Z', durationSeconds: 90 });
		dbV6.close();

		const dbV7 = await Database.createInstance(factory, 7);
		const records = await dbV7.getAll<Record<string, unknown>>('executionRest');
		expect(records).toHaveLength(1);
		expect(records[0]).not.toHaveProperty('workoutName');
		dbV7.close();
	});

	it('migration 005 is a no-op when no user exists', async () => {
		const dbV4 = await Database.createInstance(factory, 4);
		await dbV4.add('workout', { name: 'Push Day', exercises: [] }); // no username, no user in db
		dbV4.close();

		const dbV5 = await Database.createInstance(factory, 5);

		const [workout] = await dbV5.getAll<{ username?: string }>('workout');
		expect(workout.username).toBeUndefined();

		dbV5.close();
	});

	it('userWeightProgression supports multiple entries for the same username', async () => {
		const db = await Database.createInstance(factory);

		await db.add('userWeightProgression', { username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		await db.add('userWeightProgression', { username: 'alice', createdAt: new Date('2026-02-01'), weight: 68 });
		await db.add('userWeightProgression', { username: 'alice', createdAt: new Date('2026-03-01'), weight: 66 });

		const all = await db.getAll<{ id: number; username: string; weight: number }>('userWeightProgression');
		expect(all).toHaveLength(3);
		expect(all.every((e) => e.username === 'alice')).toBe(true);
		expect(all[0].id).toBe(1);
		expect(all[2].id).toBe(3);

		db.close();
	});
});

// ─── CRUD operations ─────────────────────────────────────────────────────────

describe('add()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('inserts a record that can be retrieved', async () => {
		await db.add('users', { username: 'bob', sex: 'MALE', age: 30, weight: 80, height: 180 });
		const found = await db.get<{ username: string }>('users', 'bob');
		expect(found?.username).toBe('bob');
		db.close();
	});

	it('rejects with DBError when the key already exists', async () => {
		await db.add('users', { username: 'carol', sex: 'FEMALE', age: 25, weight: 55, height: 160 });
		await expect(
			db.add('users', { username: 'carol', sex: 'FEMALE', age: 25, weight: 55, height: 160 }),
		).rejects.toBeInstanceOf(DBError);
		db.close();
	});

	it('rejects when the object store does not exist', async () => {
		await expect(
			db.add('nonExistentStore', { id: 1 }),
		).rejects.toBeInstanceOf(DBError);
		db.close();
	});

});

describe('put()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('inserts a record when the key does not exist (upsert)', async () => {
		await db.put('users', { username: 'dave', sex: 'MALE', age: 35, weight: 90, height: 185 });
		const found = await db.get<{ username: string }>('users', 'dave');
		expect(found?.username).toBe('dave');
		db.close();
	});

	it('updates an existing record', async () => {
		await db.add('users', { username: 'eve', sex: 'FEMALE', age: 22, weight: 58, height: 162 });
		await db.put('users', { username: 'eve', sex: 'FEMALE', age: 23, weight: 59, height: 162 });
		const found = await db.get<{ username: string; age: number }>('users', 'eve');
		expect(found?.age).toBe(23);
		db.close();
	});
});

describe('get()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('returns the record for a known key', async () => {
		await db.add('workout', { name: 'Push Day', exercises: ['Bench Press'] });
		const found = await db.get<{ name: string; exercises: string[] }>('workout', 'Push Day');
		expect(found?.name).toBe('Push Day');
		expect(found?.exercises).toEqual(['Bench Press']);
		db.close();
	});

	it('returns undefined for a key that does not exist', async () => {
		const result = await db.get('users', 'nobody');
		expect(result).toBeUndefined();
		db.close();
	});
});

describe('getAll()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('returns an empty array for an empty store', async () => {
		const result = await db.getAll('users');
		expect(result).toEqual([]);
		db.close();
	});

	it('returns all inserted records', async () => {
		await db.add('exercise', { name: 'Squat', bodyRegion: ['Quads', 'Glutes'], type: 'push' });
		await db.add('exercise', { name: 'Deadlift', bodyRegion: ['Back', 'Hamstrings'], type: 'pull' });
		const result = await db.getAll<{ name: string }>('exercise');
		expect(result).toHaveLength(2);
		const names = result.map((r) => r.name);
		expect(names).toContain('Squat');
		expect(names).toContain('Deadlift');
		db.close();
	});

	it('rejects when the store does not exist', async () => {
		await expect(db.getAll('ghost')).rejects.toBeInstanceOf(DBError);
		db.close();
	});
});

describe('delete()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('removes an existing record', async () => {
		await db.add('users', { username: 'frank', sex: 'MALE', age: 40, weight: 85, height: 178 });
		await db.delete('users', 'frank');
		const found = await db.get('users', 'frank');
		expect(found).toBeUndefined();
		db.close();
	});

	it('is silent when the key does not exist', async () => {
		await expect(db.delete('users', 'nobody')).resolves.toBeUndefined();
		db.close();
	});
});

// ─── addGetKey() ─────────────────────────────────────────────────────────────

describe('addGetKey()', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('inserts a record and returns its auto-incremented key', async () => {
		const key = await db.addGetKey('execution', {
			workoutName: 'Push Day',
			exerciseName: 'Bench Press',
			repNumber: 10,
			timestamp: new Date().toISOString(),
		});
		expect(key).toBe(1);
		db.close();
	});

	it('returns incrementing keys for successive inserts', async () => {
		const k1 = await db.addGetKey('execution', { workoutName: 'A', exerciseName: 'B', repNumber: 5, timestamp: new Date().toISOString() });
		const k2 = await db.addGetKey('execution', { workoutName: 'A', exerciseName: 'C', repNumber: 8, timestamp: new Date().toISOString() });
		expect(k1).toBe(1);
		expect(k2).toBe(2);
		db.close();
	});

	it('rejects when the object store does not exist', async () => {
		await expect(db.addGetKey('ghost', { id: 1 })).rejects.toBeInstanceOf(DBError);
		db.close();
	});
});

describe('autoIncrement key (execution store)', () => {
	let db: Database;

	beforeEach(async () => {
		db = await Database.createInstance(factory);
	});

	it('assigns an auto-incremented id on add()', async () => {
		await db.add('execution', {
			workoutName: 'Push Day',
			exerciseName: 'Bench Press',
			repNumber: 10,
			timestamp: new Date().toISOString(),
		});
		await db.add('execution', {
			workoutName: 'Push Day',
			exerciseName: 'Overhead Press',
			repNumber: 8,
			timestamp: new Date().toISOString(),
		});

		const all = await db.getAll<{ id: number; exerciseName: string }>('execution');
		expect(all).toHaveLength(2);
		expect(all[0].id).toBe(1);
		expect(all[1].id).toBe(2);
		db.close();
	});

	it('can delete a record by its auto-incremented id', async () => {
		await db.add('execution', {
			workoutName: 'Leg Day',
			exerciseName: 'Squat',
			repNumber: 5,
			timestamp: new Date().toISOString(),
		});

		const [entry] = await db.getAll<{ id: number }>('execution');
		await db.delete('execution', entry.id);

		const remaining = await db.getAll('execution');
		expect(remaining).toHaveLength(0);
		db.close();
	});
});
