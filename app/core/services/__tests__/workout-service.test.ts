import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { WorkoutService } from '../workout-service';
import { WorkoutRepository } from '../../entities/workout/workout-repository';
import { ExecutionRepository } from '../../entities/execution/execution-repository';
import type { Workout } from '../../entities/workout/workout';
import type { Execution } from '../../entities/execution/execution';
import { WeekDay } from '../../entities/workout/workout';

let db: Database;
let service: WorkoutService;
let workoutRepo: WorkoutRepository;
let executionRepo: ExecutionRepository;

const pushDay: Workout = {
	name: 'Push Day',
	username: 'alice',
	exercises: [{ name: 'Bench Press', metrics: ['reps', 'weight'] }],
};

const legDay: Workout = {
	name: 'Leg Day',
	username: 'alice',
	exercises: [{ name: 'Squat', metrics: ['reps'] }],
};

function makeExecution(overrides: Partial<Execution> = {}): Omit<Execution, 'id'> {
	return {
		workoutName: 'Push Day',
		exerciseName: 'Bench Press',
		timestamp: new Date().toISOString(),
		username: 'alice',
		repNumber: 8,
		...overrides,
	};
}

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	service = new WorkoutService(db);
	workoutRepo = new WorkoutRepository(db);
	executionRepo = new ExecutionRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── update() with rename ─────────────────────────────────────────────────────

describe('update() — rename', () => {
	it('updates the workout name in the workout store', async () => {
		await workoutRepo.add(pushDay);
		await service.update('Push Day', { ...pushDay, name: 'Chest Day' });
		const updated = await workoutRepo.get('Chest Day');
		expect(updated?.name).toBe('Chest Day');
		const old = await workoutRepo.get('Push Day');
		expect(old).toBeUndefined();
	});

	it('preserves exercises and weekDays during rename', async () => {
		const withDays: Workout = { ...pushDay, weekDays: [WeekDay.MONDAY, WeekDay.THURSDAY] };
		await workoutRepo.add(withDays);
		await service.update('Push Day', { ...withDays, name: 'Chest Day' });
		const updated = await workoutRepo.get('Chest Day');
		expect(updated?.exercises).toEqual(pushDay.exercises);
		expect(updated?.weekDays).toEqual([WeekDay.MONDAY, WeekDay.THURSDAY]);
	});

	it('cascades name change to executions that reference the old name', async () => {
		await workoutRepo.add(pushDay);
		await executionRepo.add(makeExecution());
		await service.update('Push Day', { ...pushDay, name: 'Chest Day' });
		const all = await executionRepo.getAll();
		expect(all[0].workoutName).toBe('Chest Day');
	});

	it('does not modify executions from other workouts', async () => {
		await workoutRepo.add(pushDay);
		await workoutRepo.add(legDay);
		await executionRepo.add(makeExecution({ workoutName: 'Push Day' }));
		await executionRepo.add(makeExecution({ workoutName: 'Leg Day', exerciseName: 'Squat' }));
		await service.update('Push Day', { ...pushDay, name: 'Chest Day' });
		const all = await executionRepo.getAll();
		const legEx = all.find((e) => e.workoutName === 'Leg Day');
		expect(legEx).toBeDefined();
	});

	it('cascades rename to multiple executions', async () => {
		await workoutRepo.add(pushDay);
		await executionRepo.add(makeExecution({ repNumber: 8 }));
		await executionRepo.add(makeExecution({ repNumber: 10 }));
		await service.update('Push Day', { ...pushDay, name: 'Chest Day' });
		const all = await executionRepo.getAll();
		expect(all).toHaveLength(2);
		expect(all.every((e) => e.workoutName === 'Chest Day')).toBe(true);
	});

	it('throws when renaming to a name that already exists', async () => {
		await workoutRepo.add(pushDay);
		await workoutRepo.add(legDay);
		await expect(service.update('Push Day', { ...pushDay, name: 'Leg Day' })).rejects.toThrow();
	});
});

// ─── update() without rename ──────────────────────────────────────────────────

describe('update() — no rename', () => {
	it('updates workout exercises without touching executions', async () => {
		await workoutRepo.add(pushDay);
		await executionRepo.add(makeExecution());
		const updatedWorkout: Workout = {
			...pushDay,
			exercises: [{ name: 'Dips', metrics: ['reps'] }],
		};
		await service.update('Push Day', updatedWorkout);
		const workout = await workoutRepo.get('Push Day');
		expect(workout?.exercises[0].name).toBe('Dips');
		const execs = await executionRepo.getAll();
		expect(execs[0].workoutName).toBe('Push Day');
	});

	it('updates weekDays without renaming', async () => {
		await workoutRepo.add(pushDay);
		await service.update('Push Day', { ...pushDay, weekDays: [WeekDay.TUESDAY] });
		const updated = await workoutRepo.get('Push Day');
		expect(updated?.weekDays).toEqual([WeekDay.TUESDAY]);
	});
});

// ─── delete() ─────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes the workout from the store', async () => {
		await workoutRepo.add(pushDay);
		await service.delete('Push Day');
		const found = await workoutRepo.get('Push Day');
		expect(found).toBeUndefined();
	});

	it('is silent when workout does not exist', async () => {
		await expect(service.delete('Ghost Workout')).resolves.not.toThrow();
	});
});
