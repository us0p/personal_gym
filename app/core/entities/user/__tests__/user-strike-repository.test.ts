import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { UserStrikeRepository } from '../user-strike-repository';

let factory: IDBFactory;
let db: Database;
let repo: UserStrikeRepository;

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new UserStrikeRepository(db);
	vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
	db.close();
	vi.useRealTimers();
});

// ─── get() ───────────────────────────────────────────────────────────────────

describe('get()', () => {
	it('returns undefined when no strike exists for the user', async () => {
		expect(await repo.get('alice')).toBeUndefined();
	});

	it('returns the strike after the first log', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		const strike = await repo.get('alice');
		expect(strike?.username).toBe('alice');
		expect(strike?.strikeCount).toBe(1);
	});
});

// ─── recordLog() – first log ──────────────────────────────────────────────────

describe('recordLog() – first log', () => {
	it('creates a new strike with count 1', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
	});

	it('sets maxStrike to 1', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.maxStrike).toBe(1);
	});

	it('returns increased: true', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		const { increased } = await repo.recordLog('alice');
		expect(increased).toBe(true);
	});

	it('persists the strike so get() returns it', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		expect(await repo.get('alice')).toBeDefined();
	});
});

// ─── recordLog() – same calendar day ─────────────────────────────────────────

describe('recordLog() – same calendar day', () => {
	beforeEach(async () => {
		vi.setSystemTime(new Date('2026-04-01T09:00:00.000Z'));
		await repo.recordLog('alice');
	});

	it('does not increment the count', async () => {
		vi.setSystemTime(new Date('2026-04-01T15:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
	});

	it('returns increased: false', async () => {
		vi.setSystemTime(new Date('2026-04-01T15:00:00.000Z'));
		const { increased } = await repo.recordLog('alice');
		expect(increased).toBe(false);
	});

	it('does not update updatedAt', async () => {
		const before = await repo.get('alice');
		vi.setSystemTime(new Date('2026-04-01T23:59:00.000Z'));
		await repo.recordLog('alice');
		const after = await repo.get('alice');
		expect(after?.updatedAt).toBe(before?.updatedAt);
	});

	it('still returns count 1 after multiple same-day logs', async () => {
		vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-01T18:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
	});
});

// ─── recordLog() – consecutive day ───────────────────────────────────────────

describe('recordLog() – consecutive day (different date, within 24h)', () => {
	beforeEach(async () => {
		vi.setSystemTime(new Date('2026-04-01T22:00:00.000Z')); // 10 pm
		await repo.recordLog('alice');
	});

	it('increments the count when logging the next morning', async () => {
		vi.setSystemTime(new Date('2026-04-02T08:00:00.000Z')); // 10h later
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(2);
	});

	it('returns increased: true', async () => {
		vi.setSystemTime(new Date('2026-04-02T08:00:00.000Z'));
		const { increased } = await repo.recordLog('alice');
		expect(increased).toBe(true);
	});

	it('raises maxStrike when the streak is the new best', async () => {
		vi.setSystemTime(new Date('2026-04-02T08:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.maxStrike).toBe(2);
	});

	it('builds a streak of 3 over three consecutive days', async () => {
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(3);
		expect(strike.maxStrike).toBe(3);
	});
});

// ─── recordLog() – lapsed streak ─────────────────────────────────────────────

describe('recordLog() – lapsed streak (more than 24h gap)', () => {
	beforeEach(async () => {
		// Build a streak of 3
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
		await repo.recordLog('alice');
	});

	it('resets the count to 1 after a multi-day gap', async () => {
		vi.setSystemTime(new Date('2026-04-06T10:00:00.000Z')); // 3-day gap
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
	});

	it('returns increased: false after a lapsed streak', async () => {
		vi.setSystemTime(new Date('2026-04-06T10:00:00.000Z'));
		const { increased } = await repo.recordLog('alice');
		expect(increased).toBe(false);
	});

	it('resets even when just over 24h have passed on the next calendar day', async () => {
		// Day 3 log at 10:00; log again at 10:01 the day after (24h1m later)
		vi.setSystemTime(new Date('2026-04-04T10:01:00.000Z'));
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
	});
});

// ─── maxStrike tracking ───────────────────────────────────────────────────────

describe('maxStrike tracking', () => {
	it('preserves maxStrike after the streak resets', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
		await repo.recordLog('alice'); // streak = 3, max = 3

		vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z')); // big gap
		const { strike } = await repo.recordLog('alice');
		expect(strike.strikeCount).toBe(1);
		expect(strike.maxStrike).toBe(3);
	});

	it('updates maxStrike only when the new streak exceeds the previous best', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice'); // streak = 2, max = 2

		vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z')); // reset
		await repo.recordLog('alice'); // streak = 1, max stays 2
		vi.setSystemTime(new Date('2026-04-11T10:00:00.000Z'));
		await repo.recordLog('alice'); // streak = 2, max stays 2 (tied, not exceeded)
		const tied = await repo.get('alice');
		expect(tied?.maxStrike).toBe(2);

		vi.setSystemTime(new Date('2026-04-12T10:00:00.000Z'));
		const { strike } = await repo.recordLog('alice'); // streak = 3, new max
		expect(strike.maxStrike).toBe(3);
	});
});

// ─── user isolation ───────────────────────────────────────────────────────────

describe('user isolation', () => {
	it('tracks strikes independently per username', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice'); // alice streak = 2

		await repo.recordLog('bob'); // bob first log = 1

		expect((await repo.get('alice'))?.strikeCount).toBe(2);
		expect((await repo.get('bob'))?.strikeCount).toBe(1);
	});

	it('a lapse for one user does not affect another', async () => {
		vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));
		await repo.recordLog('alice');
		vi.setSystemTime(new Date('2026-04-02T10:00:00.000Z'));
		await repo.recordLog('alice');
		await repo.recordLog('bob');

		vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));
		await repo.recordLog('alice'); // alice lapses, resets to 1

		vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
		await repo.recordLog('bob'); // bob continues to 2

		expect((await repo.get('alice'))?.strikeCount).toBe(1);
		expect((await repo.get('bob'))?.strikeCount).toBe(2);
	});
});
