import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { ExecutionRepository } from '../execution-repository';

let factory: IDBFactory;
let db: Database;
let repo: ExecutionRepository;

const base = { username: 'alice', workoutName: 'Push Day', exerciseName: 'Bench Press' };

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new ExecutionRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── add() ───────────────────────────────────────────────────────────────────

describe('add()', () => {
	it('saves an execution, assigns an auto-incremented id, and returns it', async () => {
		const id = await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		expect(id).toBe(1);
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].id).toBe(1);
		expect(all[0].repNumber).toBe(10);
	});

	it('allows multiple executions for the same workout and exercise', async () => {
		await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		await repo.add({ ...base, repNumber: 8, timestamp: '2026-04-03T10:05:00.000Z' });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
	});
});

// ─── getAll() ────────────────────────────────────────────────────────────────

describe('getAll()', () => {
	it('returns an empty array when no executions exist', async () => {
		expect(await repo.getAll()).toEqual([]);
	});

	it('returns all executions sorted by timestamp descending', async () => {
		await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-01T10:00:00.000Z' });
		await repo.add({ ...base, repNumber: 8, timestamp: '2026-04-03T10:00:00.000Z' });
		await repo.add({ ...base, repNumber: 6, timestamp: '2026-04-02T10:00:00.000Z' });
		const all = await repo.getAll();
		expect(all[0].repNumber).toBe(8);  // 2026-04-03 first
		expect(all[1].repNumber).toBe(6);  // 2026-04-02 second
		expect(all[2].repNumber).toBe(10); // 2026-04-01 last
	});
});

// ─── getByWorkout() ──────────────────────────────────────────────────────────

describe('getByWorkout()', () => {
	beforeEach(async () => {
		await repo.add({ ...base, workoutName: 'Push Day', repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		await repo.add({ ...base, workoutName: 'Push Day', repNumber: 8, timestamp: '2026-04-03T10:05:00.000Z' });
		await repo.add({ ...base, workoutName: 'Leg Day', repNumber: 5, timestamp: '2026-04-03T11:00:00.000Z' });
	});

	it('returns only executions for the given workout', async () => {
		const result = await repo.getByWorkout('Push Day');
		expect(result).toHaveLength(2);
		expect(result.every((e) => e.workoutName === 'Push Day')).toBe(true);
	});

	it('does not return executions from other workouts', async () => {
		const result = await repo.getByWorkout('Push Day');
		expect(result.some((e) => e.workoutName === 'Leg Day')).toBe(false);
	});

	it('returns results sorted by timestamp descending', async () => {
		const result = await repo.getByWorkout('Push Day');
		expect(result[0].repNumber).toBe(8);  // 10:05 first
		expect(result[1].repNumber).toBe(10); // 10:00 second
	});

	it('returns an empty array when no executions match', async () => {
		expect(await repo.getByWorkout('Pull Day')).toEqual([]);
	});
});

// ─── getByWorkoutAndExercise() ───────────────────────────────────────────────

describe('getByWorkoutAndExercise()', () => {
	beforeEach(async () => {
		await repo.add({ ...base, workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		await repo.add({ ...base, workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 8,  timestamp: '2026-04-03T10:05:00.000Z' });
		await repo.add({ ...base, workoutName: 'Push Day', exerciseName: 'OHP',          repNumber: 6,  timestamp: '2026-04-03T10:10:00.000Z' });
		await repo.add({ ...base, workoutName: 'Leg Day',  exerciseName: 'Bench Press', repNumber: 12, timestamp: '2026-04-03T11:00:00.000Z' });
	});

	it('returns only entries matching both workout and exercise', async () => {
		const result = await repo.getByWorkoutAndExercise('Push Day', 'Bench Press');
		expect(result).toHaveLength(2);
		expect(result.every((e) => e.workoutName === 'Push Day' && e.exerciseName === 'Bench Press')).toBe(true);
	});

	it('does not return entries for a different exercise in the same workout', async () => {
		const result = await repo.getByWorkoutAndExercise('Push Day', 'Bench Press');
		expect(result.some((e) => e.exerciseName === 'OHP')).toBe(false);
	});

	it('does not return entries for the same exercise in a different workout', async () => {
		const result = await repo.getByWorkoutAndExercise('Push Day', 'Bench Press');
		expect(result.some((e) => e.workoutName === 'Leg Day')).toBe(false);
	});

	it('returns results sorted by timestamp descending', async () => {
		const result = await repo.getByWorkoutAndExercise('Push Day', 'Bench Press');
		expect(result[0].repNumber).toBe(8);  // 10:05 first
		expect(result[1].repNumber).toBe(10); // 10:00 second
	});

	it('returns an empty array when no entries match', async () => {
		expect(await repo.getByWorkoutAndExercise('Push Day', 'Squat')).toEqual([]);
	});
});

// ─── cardio executions ───────────────────────────────────────────────────────

describe('cardio executions', () => {
	it('saves a cardio execution with durationMin and no repNumber', async () => {
		await repo.add({ ...base, durationMin: 30, timestamp: '2026-04-03T10:00:00.000Z' });
		const all = await repo.getAll();
		expect(all).toHaveLength(1);
		expect(all[0].durationMin).toBe(30);
		expect(all[0].repNumber).toBeUndefined();
	});

	it('saves a strength execution with repNumber and no durationMin', async () => {
		await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		const all = await repo.getAll();
		expect(all[0].repNumber).toBe(10);
		expect(all[0].durationMin).toBeUndefined();
	});

	it('stores cardio and strength executions together', async () => {
		await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		await repo.add({ ...base, durationMin: 20, timestamp: '2026-04-03T10:05:00.000Z' });
		const all = await repo.getAll();
		expect(all).toHaveLength(2);
		const cardio = all.find((e) => e.durationMin !== undefined)!;
		const strength = all.find((e) => e.repNumber !== undefined)!;
		expect(cardio.durationMin).toBe(20);
		expect(strength.repNumber).toBe(10);
	});
});

// ─── delete() ────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes an execution by id', async () => {
		await repo.add({ ...base, repNumber: 10, timestamp: '2026-04-03T10:00:00.000Z' });
		const [entry] = await repo.getAll();
		await repo.delete(entry.id!);
		expect(await repo.getAll()).toHaveLength(0);
	});

	it('is silent when the id does not exist', async () => {
		await expect(repo.delete(999)).resolves.toBeUndefined();
	});
});
