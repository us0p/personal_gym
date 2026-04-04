import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { ExecutionRestRepository } from '../execution-rest-repository';

let factory: IDBFactory;
let db: Database;
let repo: ExecutionRestRepository;

const base = {
	executionId: 1,
	workoutName: 'Push Day',
	durationSeconds: 90,
};

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new ExecutionRestRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── add() ───────────────────────────────────────────────────────────────────

describe('add()', () => {
	it('saves a rest entry and assigns an auto-incremented id', async () => {
		await repo.add({ ...base, timestamp: '2026-04-04T10:00:00.000Z' });
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(1);
		expect(all[0].durationSeconds).toBe(90);
		expect(all[0].workoutName).toBe('Push Day');
	});

	it('allows multiple rest entries for the same execution', async () => {
		await repo.add({ ...base, timestamp: '2026-04-04T10:00:00.000Z' });
		await repo.add({ ...base, timestamp: '2026-04-04T10:05:00.000Z' });
		expect(await repo.getAll()).toHaveLength(2);
	});

	it('assigns incrementing ids across entries', async () => {
		await repo.add({ ...base, timestamp: '2026-04-04T10:00:00.000Z' });
		await repo.add({ ...base, timestamp: '2026-04-04T10:05:00.000Z' });
		const all = await repo.getAll();
		const ids = all.map((r) => r.id).sort();
		expect(ids).toEqual([1, 2]);
	});
});

// ─── getByExecution() ────────────────────────────────────────────────────────

describe('getByExecution()', () => {
	beforeEach(async () => {
		await repo.add({ ...base, executionId: 1, timestamp: '2026-04-04T10:00:00.000Z' });
		await repo.add({ ...base, executionId: 1, timestamp: '2026-04-04T10:05:00.000Z' });
		await repo.add({ ...base, executionId: 2, timestamp: '2026-04-04T10:10:00.000Z' });
	});

	it('returns only entries for the given executionId', async () => {
		const result = await repo.getByExecution(1);
		expect(result).toHaveLength(2);
		expect(result.every((r) => r.executionId === 1)).toBe(true);
	});

	it('does not return entries for a different executionId', async () => {
		const result = await repo.getByExecution(1);
		expect(result.some((r) => r.executionId === 2)).toBe(false);
	});

	it('returns an empty array when no entries match', async () => {
		expect(await repo.getByExecution(999)).toEqual([]);
	});
});

// ─── getAll() ────────────────────────────────────────────────────────────────

describe('getAll()', () => {
	it('returns an empty array when no entries exist', async () => {
		expect(await repo.getAll()).toEqual([]);
	});

	it('returns all rest entries', async () => {
		await repo.add({ ...base, executionId: 1, timestamp: '2026-04-04T10:00:00.000Z' });
		await repo.add({ ...base, executionId: 2, timestamp: '2026-04-04T10:05:00.000Z' });
		expect(await repo.getAll()).toHaveLength(2);
	});
});
