import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { WorkoutRepository } from '../workout-repository';
import { WeekDay } from '../workout';

let factory: IDBFactory;
let db: Database;
let repo: WorkoutRepository;

import type { WorkoutExercise } from '../workout';

const base = { username: 'alice', exercises: [] as WorkoutExercise[] };

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
	it('creates a workout without weekDays', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		const found = await repo.get('Push Day');
		expect(found?.name).toBe('Push Day');
		expect(found?.weekDays).toBeUndefined();
	});

	it('creates a workout with a single weekDay', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY] });
		const found = await repo.get('Push Day');
		expect(found?.weekDays).toEqual([WeekDay.MONDAY]);
	});

	it('rejects when a workout with the same name already exists', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await expect(repo.add({ ...base, name: 'Push Day' })).rejects.toThrow();
	});
});

// ─── get() ───────────────────────────────────────────────────────────────────

describe('get()', () => {
	it('returns the workout for a known name', async () => {
		await repo.add({ ...base, name: 'Leg Day', weekDays: [WeekDay.WEDNESDAY] });
		const found = await repo.get('Leg Day');
		expect(found?.weekDays).toEqual([WeekDay.WEDNESDAY]);
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

	it('returns all workouts regardless of weekDays', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY] });
		await repo.add({ ...base, name: 'Pull Day' });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});
});

// ─── getByWeekDay() ──────────────────────────────────────────────────────────

describe('getByWeekDay()', () => {
	beforeEach(async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY] });
		await repo.add({ ...base, name: 'Pull Day', weekDays: [WeekDay.WEDNESDAY] });
		await repo.add({ ...base, name: 'Rest Day' }); // no weekDays
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

	it('does not return workouts with no weekDays', async () => {
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
	it('adds weekDays to a workout that had none', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		await repo.update({ ...base, name: 'Push Day', weekDays: [WeekDay.TUESDAY] });
		const found = await repo.get('Push Day');
		expect(found?.weekDays).toEqual([WeekDay.TUESDAY]);
	});

	it('changes the weekDays of an existing workout', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY] });
		await repo.update({ ...base, name: 'Push Day', weekDays: [WeekDay.FRIDAY] });
		const found = await repo.get('Push Day');
		expect(found?.weekDays).toEqual([WeekDay.FRIDAY]);
	});

	it('clears weekDays when updated without them', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY] });
		await repo.update({ ...base, name: 'Push Day' });
		const found = await repo.get('Push Day');
		expect(found?.weekDays).toBeUndefined();
		const monday = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(monday).toHaveLength(0);
	});

	it('updates the exercises list', async () => {
		await repo.add({ ...base, name: 'Push Day' });
		const exercises: WorkoutExercise[] = [
			{ name: 'Bench Press', metrics: ['reps'] },
			{ name: 'OHP', metrics: ['reps', 'weight'] },
		];
		await repo.update({ ...base, name: 'Push Day', exercises });
		const found = await repo.get('Push Day');
		expect(found?.exercises).toEqual(exercises);
	});
});

// ─── multiple weekDays ───────────────────────────────────────────────────────

describe('multiple weekDays', () => {
	it('creates a workout with multiple weekDays', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY, WeekDay.THURSDAY] });
		const found = await repo.get('Push Day');
		expect(found?.weekDays).toEqual([WeekDay.MONDAY, WeekDay.THURSDAY]);
	});

	it('getByWeekDay returns a workout if the day is included in weekDays', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY, WeekDay.THURSDAY] });
		const monday = await repo.getByWeekDay(WeekDay.MONDAY);
		expect(monday).toHaveLength(1);
		expect(monday[0].name).toBe('Push Day');
		const thursday = await repo.getByWeekDay(WeekDay.THURSDAY);
		expect(thursday).toHaveLength(1);
		expect(thursday[0].name).toBe('Push Day');
	});

	it('getByWeekDay does not return a workout when the day is not in weekDays', async () => {
		await repo.add({ ...base, name: 'Push Day', weekDays: [WeekDay.MONDAY, WeekDay.THURSDAY] });
		expect(await repo.getByWeekDay(WeekDay.TUESDAY)).toHaveLength(0);
	});

	it('creates a workout with no weekDays', async () => {
		await repo.add({ ...base, name: 'Free Day' });
		const found = await repo.get('Free Day');
		expect(found?.weekDays).toBeUndefined();
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
