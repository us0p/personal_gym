import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { ExecutionSpeedRepository } from '../execution-speed-repository';

let factory: IDBFactory;
let db: Database;
let repo: ExecutionSpeedRepository;

const base = {
	exerciseName: 'Bench Press',
	workoutName: 'Push Day',
	executionDuration: 1.5,
};

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new ExecutionSpeedRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── add() ───────────────────────────────────────────────────────────────────

describe('add()', () => {
	it('saves an entry and assigns an auto-incremented id', async () => {
		await repo.add({ ...base });
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(1);
		expect(all[0].exerciseName).toBe('Bench Press');
		expect(all[0].workoutName).toBe('Push Day');
		expect(all[0].executionDuration).toBe(1.5);
	});

	it('assigns incrementing ids across entries', async () => {
		await repo.add({ ...base });
		await repo.add({ ...base, exerciseName: 'Squat', workoutName: 'Leg Day', executionDuration: 2 });
		const all = await repo.getAll();
		const ids = all.map((r) => r.id).sort();
		expect(ids).toEqual([1, 2]);
	});

	it('allows multiple entries for the same exercise', async () => {
		await repo.add({ ...base });
		await repo.add({ ...base, executionDuration: 2 });
		expect(await repo.getAll()).toHaveLength(2);
	});
});

// ─── getAll() ────────────────────────────────────────────────────────────────

describe('getAll()', () => {
	it('returns an empty array when no entries exist', async () => {
		expect(await repo.getAll()).toEqual([]);
	});

	it('returns all saved entries', async () => {
		await repo.add({ ...base });
		await repo.add({ ...base, exerciseName: 'Squat', executionDuration: 2 });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});
});
