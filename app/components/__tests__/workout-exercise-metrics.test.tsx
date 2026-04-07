// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import WorkoutExerciseMetrics, { computeAverageRest, computeAverageSpeed } from '../workout-exercise-metrics';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockWorkouts = [
	{ name: 'Push Day', exercises: ['Bench Press', 'OHP'] },
	{ name: 'Leg Day', exercises: ['Squat'] },
];

const mockExecutions = [
	{ id: 1, workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 10, timestamp: '2026-04-01T10:00:00.000Z' },
	{ id: 2, workoutName: 'Push Day', exerciseName: 'Bench Press', repNumber: 8, timestamp: '2026-04-01T10:30:00.000Z' },
	{ id: 3, workoutName: 'Push Day', exerciseName: 'OHP', repNumber: 6, timestamp: '2026-04-01T11:00:00.000Z' },
];

const mockRestEntries = [
	{ id: 1, executionId: 1, timestamp: '2026-04-01T10:10:00.000Z', durationSeconds: 90 },
	{ id: 2, executionId: 2, timestamp: '2026-04-01T10:40:00.000Z', durationSeconds: 60 },
	{ id: 3, executionId: 3, timestamp: '2026-04-01T11:10:00.000Z', durationSeconds: 120 },
];

const mockSpeedEntries = [
	{ id: 1, workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 1.5 },
	{ id: 2, workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 2.5 },
	{ id: 3, workoutName: 'Push Day', exerciseName: 'OHP', executionDuration: 1.0 },
];

vi.mock('../../core/infra/database', () => ({
	default: {
		getInstance: vi.fn().mockResolvedValue({
			getAll: vi.fn((store: string) => {
				if (store === 'workout') return Promise.resolve(mockWorkouts);
				if (store === 'execution') return Promise.resolve(mockExecutions);
				if (store === 'executionRest') return Promise.resolve(mockRestEntries);
				if (store === 'executionSpeed') return Promise.resolve(mockSpeedEntries);
				return Promise.resolve([]);
			}),
		}),
	},
}));

// ─── computeAverageRest() ─────────────────────────────────────────────────────

describe('computeAverageRest()', () => {
	const executions = [
		{ id: 1, workoutName: 'Push Day', exerciseName: 'Bench Press' },
		{ id: 2, workoutName: 'Push Day', exerciseName: 'Bench Press' },
		{ id: 3, workoutName: 'Push Day', exerciseName: 'OHP' },
		{ id: 4, workoutName: 'Leg Day', exerciseName: 'Squat' },
	];

	const restEntries = [
		{ executionId: 1, durationSeconds: 90 },
		{ executionId: 2, durationSeconds: 60 },
		{ executionId: 3, durationSeconds: 120 },
		{ executionId: 4, durationSeconds: 45 },
	];

	it('returns null when no executions match the filter', () => {
		expect(computeAverageRest(executions, restEntries, 'Push Day', 'Deadlift')).toBeNull();
	});

	it('returns null when no rest entries exist for matching executions', () => {
		expect(computeAverageRest(executions, [], 'Push Day', 'Bench Press')).toBeNull();
	});

	it('computes the mean across all matching rest entries', () => {
		// executionId 1 (90s) and 2 (60s) → mean = 75
		expect(computeAverageRest(executions, restEntries, 'Push Day', 'Bench Press')).toBe(75);
	});

	it('excludes rest entries belonging to other exercises', () => {
		expect(computeAverageRest(executions, restEntries, 'Push Day', 'OHP')).toBe(120);
	});

	it('excludes rest entries belonging to other workouts', () => {
		expect(computeAverageRest(executions, restEntries, 'Leg Day', 'Squat')).toBe(45);
	});

	it('rounds to two decimal places', () => {
		const execs = [
			{ id: 1, workoutName: 'Push Day', exerciseName: 'Bench Press' },
			{ id: 2, workoutName: 'Push Day', exerciseName: 'Bench Press' },
			{ id: 3, workoutName: 'Push Day', exerciseName: 'Bench Press' },
		];
		const rests = [
			{ executionId: 1, durationSeconds: 100 },
			{ executionId: 2, durationSeconds: 100 },
			{ executionId: 3, durationSeconds: 101 },
		];
		// 301 / 3 = 100.333...
		expect(computeAverageRest(execs, rests, 'Push Day', 'Bench Press')).toBeCloseTo(100.33, 1);
	});
});

// ─── computeAverageSpeed() ───────────────────────────────────────────────────

describe('computeAverageSpeed()', () => {
	const entries = [
		{ workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 1.5 },
		{ workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 2.5 },
		{ workoutName: 'Push Day', exerciseName: 'OHP', executionDuration: 1.0 },
		{ workoutName: 'Leg Day', exerciseName: 'Squat', executionDuration: 3.0 },
	];

	it('returns null when no entries match the filter', () => {
		expect(computeAverageSpeed(entries, 'Push Day', 'Deadlift')).toBeNull();
	});

	it('returns null when entries list is empty', () => {
		expect(computeAverageSpeed([], 'Push Day', 'Bench Press')).toBeNull();
	});

	it('computes the mean across all matching entries', () => {
		// 1.5 + 2.5 = 4 / 2 = 2
		expect(computeAverageSpeed(entries, 'Push Day', 'Bench Press')).toBe(2);
	});

	it('excludes entries for other exercises', () => {
		expect(computeAverageSpeed(entries, 'Push Day', 'OHP')).toBe(1.0);
	});

	it('excludes entries for other workouts', () => {
		expect(computeAverageSpeed(entries, 'Leg Day', 'Squat')).toBe(3.0);
	});

	it('rounds to two decimal places', () => {
		const speedEntries = [
			{ workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 1 },
			{ workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 1 },
			{ workoutName: 'Push Day', exerciseName: 'Bench Press', executionDuration: 2 },
		];
		// 4 / 3 = 1.333...
		expect(computeAverageSpeed(speedEntries, 'Push Day', 'Bench Press')).toBeCloseTo(1.33, 1);
	});
});

// ─── Component rendering ──────────────────────────────────────────────────────

function makeFullDb() {
	return {
		getAll: vi.fn((store: string) => {
			if (store === 'workout') return Promise.resolve(mockWorkouts);
			if (store === 'execution') return Promise.resolve(mockExecutions);
			if (store === 'executionRest') return Promise.resolve(mockRestEntries);
			if (store === 'executionSpeed') return Promise.resolve(mockSpeedEntries);
			return Promise.resolve([]);
		}),
	};
}

function makeEmptyDb() {
	return {
		getAll: vi.fn((store: string) => {
			if (store === 'workout') return Promise.resolve(mockWorkouts);
			return Promise.resolve([]);
		}),
	};
}

describe('WorkoutExerciseMetrics – rendering', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Restore the default full mock for every test so each starts clean.
		const Database = (await import('../../core/infra/database')).default;
		(Database.getInstance as ReturnType<typeof vi.fn>).mockResolvedValue(makeFullDb());
	});

	it('renders the section heading', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-heading')).toBeDefined();
	});

	it('renders the workout and exercise selectors', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-workout-select')).toBeDefined();
		expect(screen.getByTestId('metrics-exercise-select')).toBeDefined();
	});

	it('populates the workout selector with all workouts', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		const select = screen.getByTestId('metrics-workout-select');
		expect(select.textContent).toContain('Push Day');
		expect(select.textContent).toContain('Leg Day');
	});

	it('populates the exercise selector with exercises for the selected workout', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		const select = screen.getByTestId('metrics-exercise-select');
		expect(select.textContent).toContain('Bench Press');
		expect(select.textContent).toContain('OHP');
	});

	it('renders the average rest metric row', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-avg-rest')).toBeDefined();
	});

	it('renders the average speed metric row', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-avg-speed')).toBeDefined();
	});

	it('displays the computed average rest value', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		// Push Day / Bench Press: (90 + 60) / 2 = 75s
		expect(screen.getByTestId('metrics-avg-rest').textContent).toContain('75');
	});

	it('displays the computed average speed value', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		// Push Day / Bench Press: (1.5 + 2.5) / 2 = 2s
		expect(screen.getByTestId('metrics-avg-speed').textContent).toContain('2');
	});

	it('shows "—" for average rest when no data exists', async () => {
		const Database = (await import('../../core/infra/database')).default;
		(Database.getInstance as ReturnType<typeof vi.fn>).mockResolvedValue(makeEmptyDb());
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-avg-rest').textContent).toContain('—');
	});

	it('shows "—" for average speed when no data exists', async () => {
		const Database = (await import('../../core/infra/database')).default;
		(Database.getInstance as ReturnType<typeof vi.fn>).mockResolvedValue(makeEmptyDb());
		await act(async () => { render(<WorkoutExerciseMetrics />); });
		expect(screen.getByTestId('metrics-avg-speed').textContent).toContain('—');
	});

	it('updates metrics when exercise selection changes', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });

		await act(async () => {
			fireEvent.change(screen.getByTestId('metrics-exercise-select'), {
				target: { value: 'OHP' },
			});
		});

		// OHP rest average = 120s, speed average = 1.0s
		expect(screen.getByTestId('metrics-avg-rest').textContent).toContain('120');
		expect(screen.getByTestId('metrics-avg-speed').textContent).toContain('1');
	});

	it('updates exercise options and metrics when workout selection changes', async () => {
		await act(async () => { render(<WorkoutExerciseMetrics />); });

		await act(async () => {
			fireEvent.change(screen.getByTestId('metrics-workout-select'), {
				target: { value: 'Leg Day' },
			});
		});

		const exerciseSelect = screen.getByTestId('metrics-exercise-select');
		expect(exerciseSelect.textContent).toContain('Squat');
		expect(exerciseSelect.textContent).not.toContain('Bench Press');
	});
});
