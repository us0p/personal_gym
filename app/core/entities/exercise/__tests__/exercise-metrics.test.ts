import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { WorkoutRepository } from '../../workout/workout-repository';
import { ExecutionRepository } from '../../execution/execution-repository';
import { METRICS_BY_TYPE } from '../exercise';
import type { WorkoutExercise } from '../../workout/workout';

// ─── METRICS_BY_TYPE ──────────────────────────────────────────────────────────

describe('METRICS_BY_TYPE', () => {
	describe('push', () => {
		it('includes reps and weight', () => {
			expect(METRICS_BY_TYPE.push).toContain('reps');
			expect(METRICS_BY_TYPE.push).toContain('weight');
		});

		it('does not include time, duration, or distance', () => {
			expect(METRICS_BY_TYPE.push).not.toContain('time');
			expect(METRICS_BY_TYPE.push).not.toContain('duration');
			expect(METRICS_BY_TYPE.push).not.toContain('distance');
		});
	});

	describe('pull', () => {
		it('includes reps and weight', () => {
			expect(METRICS_BY_TYPE.pull).toContain('reps');
			expect(METRICS_BY_TYPE.pull).toContain('weight');
		});

		it('does not include time, duration, or distance', () => {
			expect(METRICS_BY_TYPE.pull).not.toContain('time');
			expect(METRICS_BY_TYPE.pull).not.toContain('duration');
			expect(METRICS_BY_TYPE.pull).not.toContain('distance');
		});
	});

	describe('static', () => {
		it('includes time and weight', () => {
			expect(METRICS_BY_TYPE.static).toContain('time');
			expect(METRICS_BY_TYPE.static).toContain('weight');
		});

		it('does not include reps, duration, or distance', () => {
			expect(METRICS_BY_TYPE.static).not.toContain('reps');
			expect(METRICS_BY_TYPE.static).not.toContain('duration');
			expect(METRICS_BY_TYPE.static).not.toContain('distance');
		});

		it('is the only type that has the time metric', () => {
			expect(METRICS_BY_TYPE.push).not.toContain('time');
			expect(METRICS_BY_TYPE.pull).not.toContain('time');
			expect(METRICS_BY_TYPE.cardio).not.toContain('time');
		});
	});

	describe('cardio', () => {
		it('includes duration and distance', () => {
			expect(METRICS_BY_TYPE.cardio).toContain('duration');
			expect(METRICS_BY_TYPE.cardio).toContain('distance');
		});

		it('does not include reps, weight, or time', () => {
			expect(METRICS_BY_TYPE.cardio).not.toContain('reps');
			expect(METRICS_BY_TYPE.cardio).not.toContain('weight');
			expect(METRICS_BY_TYPE.cardio).not.toContain('time');
		});
	});
});

// ─── WorkoutExercise metric persistence ──────────────────────────────────────

let factory: IDBFactory;
let db: Database;
let workoutRepo: WorkoutRepository;
let execRepo: ExecutionRepository;

const baseWorkout = { name: 'Test Workout', username: 'alice' };
const baseExec = { workoutName: 'Test Workout', username: 'alice', timestamp: '2026-04-01T10:00:00.000Z' };

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	workoutRepo = new WorkoutRepository(db);
	execRepo = new ExecutionRepository(db);
});

afterEach(() => {
	db.close();
});

describe('WorkoutExercise – one metric', () => {
	it('stores and retrieves a push exercise tracking reps only', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Push-ups', metrics: ['reps'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['reps']);
	});

	it('stores and retrieves a static exercise tracking hold time only', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Plank', metrics: ['time'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['time']);
	});

	it('stores and retrieves a cardio exercise tracking duration only', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Running', metrics: ['duration'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['duration']);
	});
});

describe('WorkoutExercise – two metrics', () => {
	it('stores and retrieves a pull exercise tracking reps and weight', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Pull-ups', metrics: ['reps', 'weight'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['reps', 'weight']);
	});

	it('stores and retrieves a static exercise tracking hold time and weight', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Weighted Plank', metrics: ['time', 'weight'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['time', 'weight']);
	});

	it('stores and retrieves a cardio exercise tracking duration and distance', async () => {
		const exercises: WorkoutExercise[] = [{ name: 'Cycling', metrics: ['duration', 'distance'] }];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises[0].metrics).toEqual(['duration', 'distance']);
	});
});

describe('WorkoutExercise – multiple exercises with different metric counts', () => {
	it('preserves each exercise\'s metric config when a workout has multiple exercises', async () => {
		const exercises: WorkoutExercise[] = [
			{ name: 'Push-ups', metrics: ['reps'] },
			{ name: 'Pull-ups', metrics: ['reps', 'weight'] },
			{ name: 'Plank',    metrics: ['time'] },
			{ name: 'Running',  metrics: ['duration', 'distance'] },
		];
		await workoutRepo.add({ ...baseWorkout, exercises });
		const found = await workoutRepo.get('Test Workout');
		expect(found?.exercises).toEqual(exercises);
	});
});

// ─── Execution – metric field storage ────────────────────────────────────────

describe('Execution – reps metric', () => {
	it('stores and retrieves repNumber', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Push-ups', repNumber: 12 });
		const [entry] = await execRepo.getAll();
		expect(entry.repNumber).toBe(12);
		expect(entry.weightKg).toBeUndefined();
	});
});

describe('Execution – weight metric', () => {
	it('stores and retrieves weightKg', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Bench Press', weightKg: 80 });
		const [entry] = await execRepo.getAll();
		expect(entry.weightKg).toBe(80);
		expect(entry.repNumber).toBeUndefined();
	});
});

describe('Execution – reps + weight metrics combined', () => {
	it('stores and retrieves repNumber and weightKg together', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Pull-ups', repNumber: 8, weightKg: 10 });
		const [entry] = await execRepo.getAll();
		expect(entry.repNumber).toBe(8);
		expect(entry.weightKg).toBe(10);
	});

	it('tracks progression: first set bodyweight, second set weighted', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Pull-ups', repNumber: 10, timestamp: '2026-04-01T10:00:00.000Z' });
		await execRepo.add({ ...baseExec, exerciseName: 'Pull-ups', repNumber: 8, weightKg: 10, timestamp: '2026-04-02T10:00:00.000Z' });
		const all = await execRepo.getAll();
		const bodyweight = all.find((e) => e.weightKg === undefined)!;
		const weighted   = all.find((e) => e.weightKg !== undefined)!;
		expect(bodyweight.repNumber).toBe(10);
		expect(weighted.repNumber).toBe(8);
		expect(weighted.weightKg).toBe(10);
	});
});

describe('Execution – time metric (static exercise)', () => {
	it('stores and retrieves durationSec', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Plank', durationSec: 60 });
		const [entry] = await execRepo.getAll();
		expect(entry.durationSec).toBe(60);
		expect(entry.repNumber).toBeUndefined();
		expect(entry.durationMin).toBeUndefined();
	});

	it('stores hold time with added weight', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Weighted Plank', durationSec: 45, weightKg: 5 });
		const [entry] = await execRepo.getAll();
		expect(entry.durationSec).toBe(45);
		expect(entry.weightKg).toBe(5);
	});
});

describe('Execution – duration metric (cardio exercise)', () => {
	it('stores and retrieves durationMin', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Running', durationMin: 30 });
		const [entry] = await execRepo.getAll();
		expect(entry.durationMin).toBe(30);
		expect(entry.durationSec).toBeUndefined();
	});
});

describe('Execution – distance metric (cardio exercise)', () => {
	it('stores and retrieves distanceKm', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Running', distanceKm: 5.2 });
		const [entry] = await execRepo.getAll();
		expect(entry.distanceKm).toBe(5.2);
	});
});

describe('Execution – duration + distance metrics combined', () => {
	it('stores and retrieves durationMin and distanceKm together', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Cycling', durationMin: 45, distanceKm: 20 });
		const [entry] = await execRepo.getAll();
		expect(entry.durationMin).toBe(45);
		expect(entry.distanceKm).toBe(20);
	});

	it('tracks progression across sessions', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Running', durationMin: 30, distanceKm: 4,   timestamp: '2026-04-01T10:00:00.000Z' });
		await execRepo.add({ ...baseExec, exerciseName: 'Running', durationMin: 30, distanceKm: 4.5, timestamp: '2026-04-08T10:00:00.000Z' });
		const all = await execRepo.getAll();
		const distances = all.map((e) => e.distanceKm).sort((a, b) => (a ?? 0) - (b ?? 0));
		expect(distances).toEqual([4, 4.5]);
	});
});

describe('Execution – metric fields do not bleed between exercise types', () => {
	it('a static execution does not have repNumber or durationMin', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Plank', durationSec: 60 });
		const [entry] = await execRepo.getAll();
		expect(entry.repNumber).toBeUndefined();
		expect(entry.durationMin).toBeUndefined();
		expect(entry.distanceKm).toBeUndefined();
	});

	it('a cardio execution does not have repNumber, weightKg, or durationSec', async () => {
		await execRepo.add({ ...baseExec, exerciseName: 'Running', durationMin: 30, distanceKm: 5 });
		const [entry] = await execRepo.getAll();
		expect(entry.repNumber).toBeUndefined();
		expect(entry.weightKg).toBeUndefined();
		expect(entry.durationSec).toBeUndefined();
	});
});
