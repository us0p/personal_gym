import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { WorkoutConfigRepository } from '../workout-config-repository';

let db: Database;
let repo: WorkoutConfigRepository;

const sampleConfig = {
	username: 'alice',
	routineType: 'sequential' as const,
	entries: [
		{ type: 'workout' as const, workoutName: 'Push Day' },
		{ type: 'rest' as const },
	],
	tracking: null,
};

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	repo = new WorkoutConfigRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── get() ───────────────────────────────────────────────────────────────────

describe('get()', () => {
	it('returns undefined when no config exists', async () => {
		expect(await repo.get('alice')).toBeUndefined();
	});

	it('returns the stored config', async () => {
		await repo.upsert(sampleConfig);
		const config = await repo.get('alice');
		expect(config?.routineType).toBe('sequential');
		expect(config?.entries).toHaveLength(2);
	});
});

// ─── upsert() ────────────────────────────────────────────────────────────────

describe('upsert()', () => {
	it('creates a new config', async () => {
		await repo.upsert(sampleConfig);
		expect(await repo.get('alice')).toBeDefined();
	});

	it('overwrites an existing config', async () => {
		await repo.upsert(sampleConfig);
		await repo.upsert({ ...sampleConfig, routineType: 'scheduled' });
		const config = await repo.get('alice');
		expect(config?.routineType).toBe('scheduled');
	});
});

// ─── resetTracking() ─────────────────────────────────────────────────────────

describe('resetTracking()', () => {
	it('sets tracking to null', async () => {
		await repo.upsert({
			...sampleConfig,
			tracking: { lastCreditedDate: '2026-01-01', lastCreditedIndex: 0 },
		});
		await repo.resetTracking('alice');
		const config = await repo.get('alice');
		expect(config?.tracking).toBeNull();
	});

	it('is a no-op when no config exists', async () => {
		await expect(repo.resetTracking('nobody')).resolves.not.toThrow();
	});
});

// ─── updateTracking() ────────────────────────────────────────────────────────

describe('updateTracking()', () => {
	it('updates the tracking state', async () => {
		await repo.upsert(sampleConfig);
		await repo.updateTracking('alice', { lastCreditedDate: '2026-06-01', lastCreditedIndex: 1 });
		const config = await repo.get('alice');
		expect(config?.tracking?.lastCreditedDate).toBe('2026-06-01');
		expect(config?.tracking?.lastCreditedIndex).toBe(1);
	});

	it('is a no-op when no config exists', async () => {
		await expect(
			repo.updateTracking('nobody', { lastCreditedDate: '2026-01-01', lastCreditedIndex: 0 }),
		).resolves.not.toThrow();
	});
});
