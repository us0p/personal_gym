import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { DataPortService } from '../data-port-service';
import type { ExportData } from '../data-port-service';

let db: Database;
let service: DataPortService;

const sampleUser = { username: 'alice', sex: 'FEMALE', birthDate: '1996-01-15', height: 165, strike: 0, maxStrike: 0 };
const sampleWorkout = { name: 'Push Day', username: 'alice', exercises: [] };
const sampleExercise = { name: 'Bench Press', type: 'push', bodyRegion: ['Chest'] };
const sampleExecution = { workoutName: 'Push Day', exerciseName: 'Bench Press', timestamp: '2026-01-01T10:00:00Z', username: 'alice', repNumber: 8 };
const sampleWeight = { username: 'alice', weight: 80, createdAt: '2026-01-01T10:00:00Z' };
const sampleWorkoutConfig = { username: 'alice', routineType: 'sequential', entries: [], tracking: null };

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	service = new DataPortService(db);
});

afterEach(() => {
	db.close();
});

// ─── exportAll() ──────────────────────────────────────────────────────────────

describe('exportAll()', () => {
	it('returns an object with all store keys', async () => {
		const result = await service.exportAll();
		expect(result).toHaveProperty('users');
		expect(result).toHaveProperty('workout');
		expect(result).toHaveProperty('exercise');
		expect(result).toHaveProperty('execution');
		expect(result).toHaveProperty('userWeightProgression');
		expect(result).toHaveProperty('workoutConfig');
	});

	it('returns empty arrays for empty stores', async () => {
		const result = await service.exportAll();
		expect(result.users).toEqual([]);
		expect(result.workout).toEqual([]);
		expect(result.exercise).toEqual([]);
	});

	it('exports all records from each store', async () => {
		await db.add('users', sampleUser);
		await db.add('workout', sampleWorkout);
		await db.add('exercise', sampleExercise);
		const result = await service.exportAll();
		expect(result.users).toHaveLength(1);
		expect(result.workout).toHaveLength(1);
		expect(result.exercise).toHaveLength(1);
	});

	it('exports multiple records from a store', async () => {
		await db.add('workout', sampleWorkout);
		await db.add('workout', { name: 'Leg Day', username: 'alice', exercises: [] });
		const result = await service.exportAll();
		expect(result.workout).toHaveLength(2);
	});

	it('exports workoutConfig records', async () => {
		await db.put('workoutConfig', sampleWorkoutConfig);
		const result = await service.exportAll();
		expect(result.workoutConfig).toHaveLength(1);
		expect((result.workoutConfig![0] as typeof sampleWorkoutConfig).routineType).toBe('sequential');
	});
});

// ─── importAll() ──────────────────────────────────────────────────────────────

describe('importAll()', () => {
	it('throws when data is not an object', async () => {
		await expect(service.importAll('not an object')).rejects.toThrow('Invalid import format');
		await expect(service.importAll(null)).rejects.toThrow('Invalid import format');
		await expect(service.importAll([1, 2, 3])).rejects.toThrow('Invalid import format');
	});

	it('imports user records (upsert store)', async () => {
		const data: ExportData = { users: [sampleUser] };
		await service.importAll(data);
		const user = await db.get('users', 'alice');
		expect(user).toBeDefined();
	});

	it('overwrites existing user records on re-import', async () => {
		await db.put('users', { ...sampleUser, height: 160 });
		const data: ExportData = { users: [{ ...sampleUser, height: 165 }] };
		await service.importAll(data);
		const user = await db.get<{ height: number }>('users', 'alice');
		expect(user?.height).toBe(165);
	});

	it('imports execution records (upsert store)', async () => {
		const data: ExportData = { execution: [{ ...sampleExecution, id: 1 }] };
		await service.importAll(data);
		const all = await db.getAll<typeof sampleExecution>('execution');
		expect(all).toHaveLength(1);
	});

	it('imports workout records (append store) when not already present', async () => {
		const data: ExportData = { workout: [sampleWorkout] };
		await service.importAll(data);
		const workout = await db.get('workout', 'Push Day');
		expect(workout).toBeDefined();
	});

	it('does not overwrite existing workout records on re-import', async () => {
		await db.add('workout', { ...sampleWorkout, exercises: [{ name: 'Bench Press', metrics: ['reps'] }] });
		const data: ExportData = { workout: [sampleWorkout] };
		await service.importAll(data);
		const workout = await db.get<{ exercises: unknown[] }>('workout', 'Push Day');
		expect(workout?.exercises).toHaveLength(1);
	});

	it('adds new workouts not present in the target database', async () => {
		const data: ExportData = {
			workout: [sampleWorkout, { name: 'Leg Day', username: 'alice', exercises: [] }],
		};
		await service.importAll(data);
		const all = await db.getAll('workout');
		expect(all).toHaveLength(2);
	});

	it('imports exercise records (append store)', async () => {
		const data: ExportData = { exercise: [sampleExercise] };
		await service.importAll(data);
		const exercise = await db.get('exercise', 'Bench Press');
		expect(exercise).toBeDefined();
	});

	it('does not overwrite existing exercise records', async () => {
		await db.add('exercise', { ...sampleExercise, bodyRegion: [] });
		const data: ExportData = { exercise: [sampleExercise] };
		await service.importAll(data);
		const exercise = await db.get<{ bodyRegion: string[] }>('exercise', 'Bench Press');
		expect(exercise?.bodyRegion).toEqual([]);
	});

	it('imports userWeightProgression records (upsert store)', async () => {
		const data: ExportData = { userWeightProgression: [{ ...sampleWeight, id: 1 }] };
		await service.importAll(data);
		const all = await db.getAll('userWeightProgression');
		expect(all).toHaveLength(1);
	});

	it('imports workoutConfig records (upsert store)', async () => {
		const data: ExportData = { workoutConfig: [sampleWorkoutConfig] };
		await service.importAll(data);
		const config = await db.get<typeof sampleWorkoutConfig>('workoutConfig', 'alice');
		expect(config?.routineType).toBe('sequential');
	});

	it('skips stores whose value is not an array', async () => {
		const data = { users: 'not an array', workout: null };
		await expect(service.importAll(data)).resolves.not.toThrow();
	});

	it('is idempotent when called twice with the same export', async () => {
		const exported = await service.exportAll();
		await db.put('users', sampleUser);
		await db.add('workout', sampleWorkout);
		const data = await service.exportAll();
		await service.importAll(data);
		await service.importAll(data);
		const users = await db.getAll('users');
		const workouts = await db.getAll('workout');
		expect(users).toHaveLength(1);
		expect(workouts).toHaveLength(1);
		void exported;
	});
});
