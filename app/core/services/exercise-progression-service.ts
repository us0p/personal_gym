import Database from '../infra/database';
import type { Execution } from '../entities/execution/execution';
import type { ExerciseMetric } from '../entities/exercise/exercise';
import { ExecutionRepository } from '../entities/execution/execution-repository';
import { WorkoutRepository } from '../entities/workout/workout-repository';

export interface ChartPoint {
	date: string;
	value: number;
}

function toLocalDateKey(isoTimestamp: string): string {
	const d = new Date(isoTimestamp);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function formatDateKey(key: string): string {
	const [y, mo, d] = key.split('-').map(Number);
	return new Date(y, mo - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getMetricValue(ex: Execution, metric: ExerciseMetric): number | undefined {
	switch (metric) {
		case 'reps': return ex.repNumber;
		case 'weight': return ex.weightKg;
		case 'duration': return ex.durationMin;
		case 'time': return ex.durationSec;
		case 'distance': return ex.distanceKm;
	}
}

export class ExerciseProgressionService {
	private readonly workoutRepo: WorkoutRepository;
	private readonly executionRepo: ExecutionRepository;

	constructor(private readonly db: Database) {
		this.workoutRepo = new WorkoutRepository(db);
		this.executionRepo = new ExecutionRepository(db);
	}

	/** Returns deduplicated exercise names across all workouts, preserving insertion order. */
	async getExerciseNames(): Promise<string[]> {
		const workouts = await this.workoutRepo.getAll();
		const seen = new Set<string>();
		const names: string[] = [];
		for (const w of workouts) {
			for (const we of w.exercises) {
				if (!seen.has(we.name)) {
					seen.add(we.name);
					names.push(we.name);
				}
			}
		}
		return names;
	}

	/** Returns the metrics that have at least one recorded value for the given exercise. */
	async getAvailableMetrics(exerciseName: string): Promise<ExerciseMetric[]> {
		const executions = await this.getExecutionsForExercise(exerciseName);
		const all: ExerciseMetric[] = ['reps', 'weight', 'duration', 'time', 'distance'];
		return all.filter((m) => executions.some((e) => getMetricValue(e, m) !== undefined));
	}

	/**
	 * Builds a time series for the given exercise and metric.
	 * Each point is the maximum recorded value for that day.
	 * Points are sorted chronologically.
	 */
	async buildChartData(exerciseName: string, metric: ExerciseMetric): Promise<ChartPoint[]> {
		const executions = await this.getExecutionsForExercise(exerciseName);
		const byDate = new Map<string, number>();
		for (const e of executions) {
			const val = getMetricValue(e, metric);
			if (val === undefined) continue;
			const key = toLocalDateKey(e.timestamp);
			byDate.set(key, Math.max(byDate.get(key) ?? 0, val));
		}
		return Array.from(byDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => ({ date: formatDateKey(key), value }));
	}

	private async getExecutionsForExercise(exerciseName: string): Promise<Execution[]> {
		const all = await this.executionRepo.getAll();
		return all.filter((e) => e.exerciseName === exerciseName);
	}
}
