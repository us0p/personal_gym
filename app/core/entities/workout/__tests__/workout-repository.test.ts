import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { WorkoutRepository } from '../workout-repository';
import { WeekDay } from '../workout';

let factory: IDBFactory;
let db: Database;
let repo: WorkoutRepository;

const base = { username: 'alice', exercises: [] as string[] };

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new WorkoutRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── WeekDay enum ─────────────────────────────────────────────────────────────

describe('WeekDay', () => {
	it('has all seven days', () => {
		expect(Object.values(WeekDay)).toEqual([
			'MONDAY',
			'TUESDAY',
			'WEDNESDAY',
			'THURSDAY',
			'FRIDAY',
			'SATURDAY',
			'SUNDAY',
		]);
	});
});

// ─── add() ───────────────────────────────────────────────────────────────────

describe('add()', () => {
	it('creates a workout without weekDay', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		const found = await repo.get('Push Day');
		expect(found?.name).toBe('Push Day');
		expect(found?.weekDay).toBeUndefined();
	});

	it('creates a workout with a weekDay', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDay: WeekDay.MONDAY });
		const found = await repo.get('Push Day');
		expect(found?.weekDay).toBe(WeekDay.MONDAY);
	});

	it('rejects when a workout with the same name already exists', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await expect(repo.add({ ...base, name: 'Push Day' })).rejects.toThrow();
	});
});

// ─── get() ───────────────────────────────────────────────────────────────────

describe('get()', () => {
	it('returns the workout for a known name', async () => {
		await repo.add({ ...base, name: 'Leg Day', weekDay: WeekDay.WEDNESDAY });
		const found = await repo.get('Leg Day');
		expect(found?.weekDay).toBe(WeekDay.WEDNESDAY);
	});

	it('returns undefined for an unknown name', async () => {
		expect(await repo.get('Ghost')).toBeUndefined();
	});
});

// ─── getAll() ────────────────────────────────────────────────────────────────

describe('getAll()', () => {
	it('returns an empty array when no workouts exist', async () => {
		expect(await repo.getAll()).toEqual([]);
	});

	it('returns all workouts regardless of weekDay', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDay: WeekDay.MONDAY });
		await repo.add({ ...base, name: 'Pull Day' });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});
});

// ─── getByWeekDay() ──────────────────────────────────────────────────────────

describe('getByWeekDay()', () => {
	beforeEach(async () => {
		await repo.add({ ...base, name: 'Push Day', weekDay: WeekDay.MONDAY });
		await repo.add({ ...base, name: 'Pull Day', weekDay: WeekDay.WEDNESDAY });
		await repo.add({ ...base, name: 'Rest Day' }); // no weekDay
	});

	it('returns workouts assigned to the requested day', async () => {
		const result = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Push Day');
	});

	it('does not return workouts assigned to a different day', async () => {
		const result = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(result.map((w) => w.name)).not.toContain('Pull Day');
	});

	it('does not return workouts with no weekDay', async () => {
		const result = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(result.map((w) => w.name)).not.toContain('Rest Day');
	});

	it('returns an empty array when no workouts match the day', async () => {
		const result = await repo.getByWeekDay(WeekDay.FRIDAY);
		expect(result).toEqual([]);
	});
});

// ─── update() ────────────────────────────────────────────────────────────────

describe('update()', () => {
	it('adds weekDay to a workout that had none', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await repo.update({ ...base, name: 'Push Day', weekDay: WeekDay.TUESDAY });
		const found = await repo.get('Push Day');
		expect(found?.weekDay).toBe(WeekDay.TUESDAY);
	});

	it('changes the weekDay of an existing workout', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDay: WeekDay.MONDAY });
		await repo.update({ ...base, name: 'Push Day', weekDay: WeekDay.FRIDAY });
		const found = await repo.get('Push Day');
		expect(found?.weekDay).toBe(WeekDay.FRIDAY);
	});

	it('clears weekDay when updated without it', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDay: WeekDay.MONDAY });
		await repo.update({ ...base, name: 'Push Day' });
		const found = await repo.get('Push Day');
		expect(found?.weekDay).toBeUndefined();
		const monday = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(monday).toHaveLength(0);
	});

	it('updates the exercises list', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await repo.update({ ...base, name: 'Push Day', exercises: ['Bench Press', 'OHP'] });
		const found = await repo.get('Push Day');
		expect(found?.exercises).toEqual(['Bench Press', 'OHP']);
	});
});

// ─── delete() ────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes the workout by name', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await repo.delete('Push Day');
		expect(await repo.get('Push Day')).toBeUndefined();
	});

	it('is silent when the name does not exist', async () => {
		await expect(repo.delete('Ghost')).resolves.toBeUndefined();
	});
});
