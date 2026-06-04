import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../infra/database';
import { ExerciseProgressionService } from '../exercise-progression-service';
import { WorkoutRepository } from '../../entities/workout/workout-repository';
import { ExecutionRepository } from '../../entities/execution/execution-repository';
import type { Workout } from '../../entities/workout/workout';
import type { Execution } from '../../entities/execution/execution';

let db: Database;
let service: ExerciseProgressionService;
let workoutRepo: WorkoutRepository;
let executionRepo: ExecutionRepository;

const pushDay: Workout = {
	name: 'Push Day',
	username: 'alice',
	exercises: [
		{ name: 'Bench Press', metrics: ['reps', 'weight'] },
		{ name: 'Shoulder Press', metrics: ['reps'] },
	],
};

const legDay: Workout = {
	name: 'Leg Day',
	username: 'alice',
	exercises: [{ name: 'Squat', metrics: ['reps', 'weight'] }],
};

function makeExecution(overrides: Partial<Execution> = {}): Omit<Execution, 'id'> {
	return {
		workoutName: 'Push Day',
		exerciseName: 'Bench Press',
		timestamp: '2026-01-01T10:00:00Z',
		username: 'alice',
		repNumber: 8,
		weightKg: 100,
		...overrides,
	};
}

beforeEach(async () => {
	db = await Database.createInstance(new IDBFactory());
	service = new ExerciseProgressionService(db);
	workoutRepo = new WorkoutRepository(db);
	executionRepo = new ExecutionRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── getExerciseNames() ───────────────────────────────────────────────────────

describe('getExerciseNames()', () => {
	it('returns empty list when no workouts exist', async () => {
		expect(await service.getExerciseNames()).toEqual([]);
	});

	it('returns exercise names from a single workout', async () => {
		await workoutRepo.add(pushDay);
		const names = await service.getExerciseNames();
		expect(names).toContain('Bench Press');
		expect(names).toContain('Shoulder Press');
	});

	it('deduplicates exercise names that appear in multiple workouts', async () => {
		const extraWorkout: Workout = {
			name: 'Chest Day',
			username: 'alice',
			exercises: [{ name: 'Bench Press', metrics: ['reps'] }],
		};
		await workoutRepo.add(pushDay);
		await workoutRepo.add(extraWorkout);
		const names = await service.getExerciseNames();
		expect(names.filter((n) => n === 'Bench Press')).toHaveLength(1);
	});

	it('includes exercises from multiple workouts', async () => {
		await workoutRepo.add(pushDay);
		await workoutRepo.add(legDay);
		const names = await service.getExerciseNames();
		expect(names).toContain('Bench Press');
		expect(names).toContain('Squat');
	});
});

// ─── getAvailableMetrics() ────────────────────────────────────────────────────

describe('getAvailableMetrics()', () => {
	it('returns empty array when no executions exist', async () => {
		expect(await service.getAvailableMetrics('Bench Press')).toEqual([]);
	});

	it('detects reps metric from executions', async () => {
		await executionRepo.add(makeExecution({ repNumber: 8, weightKg: undefined }));
		const metrics = await service.getAvailableMetrics('Bench Press');
		expect(metrics).toContain('reps');
	});

	it('detects weight metric from executions', async () => {
		await executionRepo.add(makeExecution({ weightKg: 100 }));
		const metrics = await service.getAvailableMetrics('Bench Press');
		expect(metrics).toContain('weight');
	});

	it('detects multiple metrics when all are present', async () => {
		await executionRepo.add(makeExecution({ repNumber: 8, weightKg: 100 }));
		const metrics = await service.getAvailableMetrics('Bench Press');
		expect(metrics).toContain('reps');
		expect(metrics).toContain('weight');
	});

	it('detects cardio metrics', async () => {
		await executionRepo.add(makeExecution({ exerciseName: 'Running', durationMin: 30, distanceKm: 5, repNumber: undefined, weightKg: undefined }));
		const metrics = await service.getAvailableMetrics('Running');
		expect(metrics).toContain('duration');
		expect(metrics).toContain('distance');
	});

	it('does not detect metrics from other exercises', async () => {
		await executionRepo.add(makeExecution({ exerciseName: 'Squat', repNumber: 10, weightKg: undefined }));
		const metrics = await service.getAvailableMetrics('Bench Press');
		expect(metrics).toEqual([]);
	});
});

// ─── buildChartData() ─────────────────────────────────────────────────────────

describe('buildChartData()', () => {
	it('returns empty array when no executions exist', async () => {
		expect(await service.buildChartData('Bench Press', 'reps')).toEqual([]);
	});

	it('returns one point per day', async () => {
		await executionRepo.add(makeExecution({ timestamp: '2026-01-01T10:00:00Z', repNumber: 8 }));
		await executionRepo.add(makeExecution({ timestamp: '2026-01-02T10:00:00Z', repNumber: 10 }));
		const data = await service.buildChartData('Bench Press', 'reps');
		expect(data).toHaveLength(2);
	});

	it('takes the maximum value when multiple executions occur on the same day', async () => {
		await executionRepo.add(makeExecution({ timestamp: '2026-01-01T08:00:00Z', repNumber: 8 }));
		await executionRepo.add(makeExecution({ timestamp: '2026-01-01T12:00:00Z', repNumber: 12 }));
		await executionRepo.add(makeExecution({ timestamp: '2026-01-01T18:00:00Z', repNumber: 10 }));
		const data = await service.buildChartData('Bench Press', 'reps');
		expect(data).toHaveLength(1);
		expect(data[0].value).toBe(12);
	});

	it('sorts points chronologically', async () => {
		await executionRepo.add(makeExecution({ timestamp: '2026-03-01T10:00:00Z', repNumber: 12 }));
		await executionRepo.add(makeExecution({ timestamp: '2026-01-01T10:00:00Z', repNumber: 8 }));
		await executionRepo.add(makeExecution({ timestamp: '2026-02-01T10:00:00Z', repNumber: 10 }));
		const data = await service.buildChartData('Bench Press', 'reps');
		expect(data[0].value).toBe(8);
		expect(data[1].value).toBe(10);
		expect(data[2].value).toBe(12);
	});

	it('excludes executions from other exercises', async () => {
		await executionRepo.add(makeExecution({ exerciseName: 'Squat', repNumber: 5 }));
		const data = await service.buildChartData('Bench Press', 'reps');
		expect(data).toHaveLength(0);
	});

	it('returns empty when the metric has no data for the exercise', async () => {
		await executionRepo.add(makeExecution({ repNumber: 8, weightKg: undefined }));
		const data = await service.buildChartData('Bench Press', 'weight');
		expect(data).toHaveLength(0);
	});

	it('formats date points as human-readable strings', async () => {
		await executionRepo.add(makeExecution({ timestamp: '2026-01-15T10:00:00Z', repNumber: 8 }));
		const data = await service.buildChartData('Bench Press', 'reps');
		expect(typeof data[0].date).toBe('string');
		expect(data[0].date.length).toBeGreaterThan(0);
	});
});
