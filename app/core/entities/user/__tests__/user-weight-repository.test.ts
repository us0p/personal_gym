import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { UserWeightRepository } from '../user-weight-repository';

let factory: IDBFactory;
let db: Database;
let repo: UserWeightRepository;

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new UserWeightRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── add() ───────────────────────────────────────────────────────────────────

describe('add()', () => {
	it('saves a weight entry and assigns an auto-incremented id', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		const all = await repo.getAllByUser('alice');
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(1);
		expect(all[0].weight).toBe(70);
	});

	it('stores the createdAt date as a Date object', async () => {
		const date = new Date('2026-03-15');
		await repo.add({ username: 'alice', createdAt: date, weight: 68 });
		const [entry] = await repo.getAllByUser('alice');
		expect(entry.createdAt).toEqual(date);
	});

	it('allows multiple entries for the same username', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-02-01'), weight: 68 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-03-01'), weight: 66 });
		const all = await repo.getAllByUser('alice');
		expect(all).toHaveLength(3);
	});
});

// ─── getAllByUser() ───────────────────────────────────────────────────────────

describe('getAllByUser()', () => {
	it('returns an empty array when no entries exist', async () => {
		expect(await repo.getAllByUser('alice')).toEqual([]);
	});

	it('returns only entries for the given username', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		await repo.add({ username: 'bob', createdAt: new Date('2026-01-01'), weight: 85 });
		const aliceEntries = await repo.getAllByUser('alice');
		expect(aliceEntries).toHaveLength(1);
		expect(aliceEntries[0].username).toBe('alice');
	});

	it('returns entries sorted by createdAt ascending', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-03-01'), weight: 66 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-02-01'), weight: 68 });
		const entries = await repo.getAllByUser('alice');
		expect(entries[0].weight).toBe(70);
		expect(entries[1].weight).toBe(68);
		expect(entries[2].weight).toBe(66);
	});
});

// ─── getLatest() ─────────────────────────────────────────────────────────────

describe('getLatest()', () => {
	it('returns undefined when no entries exist', async () => {
		expect(await repo.getLatest('alice')).toBeUndefined();
	});

	it('returns the entry with the most recent createdAt', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-03-01'), weight: 66 });
		await repo.add({ username: 'alice', createdAt: new Date('2026-02-01'), weight: 68 });
		const latest = await repo.getLatest('alice');
		expect(latest?.weight).toBe(66);
		expect(latest?.createdAt).toEqual(new Date('2026-03-01'));
	});
});

// ─── delete() ────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes a weight entry by id', async () => {
		await repo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 70 });
		const [entry] = await repo.getAllByUser('alice');
		await repo.delete(entry.id!);
		expect(await repo.getAllByUser('alice')).toEqual([]);
	});

	it('is silent when the id does not exist', async () => {
		await expect(repo.delete(999)).resolves.toBeUndefined();
	});
});
