import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { ExerciseService } from '../exercise-service';
import { WorkoutRepository } from '../../entities/workout/workout-repository';
import { ExecutionRepository } from '../../entities/execution/execution-repository';
import type { Exercise } from '../../entities/exercise/exercise';
import type { Workout } from '../../entities/workout/workout';
import type { Execution } from '../../entities/execution/execution';

let db: Database;
let service: ExerciseService;
let workoutRepo: WorkoutRepository;
let executionRepo: ExecutionRepository;

const benchPress: Exercise = { name: 'Bench Press', type: 'push', bodyRegion: ['Chest'] };
const squat: Exercise = { name: 'Squat', type: 'push', bodyRegion: ['Quads'] };

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
		weightKg: 100,
		...overrides,
	};
}

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	service = new ExerciseService(db);
	workoutRepo = new WorkoutRepository(db);
	executionRepo = new ExecutionRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── rename() ─────────────────────────────────────────────────────────────────

describe('rename()', () => {
	it('updates the exercise name in the exercise store', async () => {
		await db.add('exercise', benchPress);
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const updated = await db.get<Exercise>('exercise', 'Flat Bench');
		expect(updated?.name).toBe('Flat Bench');
		const old = await db.get<Exercise>('exercise', 'Bench Press');
		expect(old).toBeUndefined();
	});

	it('updates exercise properties along with the name', async () => {
		await db.add('exercise', benchPress);
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench', bodyRegion: ['Chest', 'Triceps'] });
		const updated = await db.get<Exercise>('exercise', 'Flat Bench');
		expect(updated?.bodyRegion).toEqual(['Chest', 'Triceps']);
	});

	it('cascades name change to workouts that reference the old name', async () => {
		await db.add('exercise', benchPress);
		await workoutRepo.add(pushDay);
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const updated = await workoutRepo.get('Push Day');
		expect(updated?.exercises[0].name).toBe('Flat Bench');
	});

	it('does not modify workouts that do not reference the old name', async () => {
		await db.add('exercise', benchPress);
		await db.add('exercise', squat);
		await workoutRepo.add(pushDay);
		await workoutRepo.add(legDay);
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const leg = await workoutRepo.get('Leg Day');
		expect(leg?.exercises[0].name).toBe('Squat');
	});

	it('cascades name change across multiple workouts', async () => {
		await db.add('exercise', benchPress);
		const extraWorkout: Workout = {
			name: 'Chest Day',
			username: 'alice',
			exercises: [{ name: 'Bench Press', metrics: ['reps'] }],
		};
		await workoutRepo.add(pushDay);
		await workoutRepo.add(extraWorkout);
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const push = await workoutRepo.get('Push Day');
		const chest = await workoutRepo.get('Chest Day');
		expect(push?.exercises[0].name).toBe('Flat Bench');
		expect(chest?.exercises[0].name).toBe('Flat Bench');
	});

	it('cascades name change to executions that reference the old name', async () => {
		await db.add('exercise', benchPress);
		await executionRepo.add(makeExecution());
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const all = await executionRepo.getAll();
		expect(all[0].exerciseName).toBe('Flat Bench');
	});

	it('does not modify executions for other exercises', async () => {
		await db.add('exercise', benchPress);
		await db.add('exercise', squat);
		await executionRepo.add(makeExecution({ exerciseName: 'Bench Press' }));
		await executionRepo.add(makeExecution({ exerciseName: 'Squat', workoutName: 'Leg Day' }));
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const all = await executionRepo.getAll();
		const squatEx = all.find((e) => e.workoutName === 'Leg Day');
		expect(squatEx?.exerciseName).toBe('Squat');
	});

	it('cascades name change across multiple executions', async () => {
		await db.add('exercise', benchPress);
		await executionRepo.add(makeExecution({ repNumber: 8 }));
		await executionRepo.add(makeExecution({ repNumber: 10 }));
		await service.rename('Bench Press', { ...benchPress, name: 'Flat Bench' });
		const all = await executionRepo.getAll();
		expect(all).toHaveLength(2);
		expect(all.every((e) => e.exerciseName === 'Flat Bench')).toBe(true);
	});

	it('no-op rename (same name) updates exercise properties without cascade', async () => {
		await db.add('exercise', benchPress);
		await workoutRepo.add(pushDay);
		await executionRepo.add(makeExecution());
		await service.rename('Bench Press', { ...benchPress, bodyRegion: ['Chest', 'Triceps'] });
		const ex = await db.get<Exercise>('exercise', 'Bench Press');
		expect(ex?.bodyRegion).toEqual(['Chest', 'Triceps']);
		const workout = await workoutRepo.get('Push Day');
		expect(workout?.exercises[0].name).toBe('Bench Press');
	});

	it('throws when renaming to a name that already exists', async () => {
		await db.add('exercise', benchPress);
		await db.add('exercise', squat);
		await expect(service.rename('Bench Press', { ...benchPress, name: 'Squat' })).rejects.toThrow();
	});
});

// ─── delete() ─────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes the exercise from the store', async () => {
		await db.add('exercise', benchPress);
		await service.delete('Bench Press');
		const found = await db.get<Exercise>('exercise', 'Bench Press');
		expect(found).toBeUndefined();
	});

	it('is silent when exercise does not exist', async () => {
		await expect(service.delete('Ghost Exercise')).resolves.not.toThrow();
	});
});
