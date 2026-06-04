import Database from '../infra/database';
import type { ExerciseMetric } from '../entities/exercise/exercise';
import type { Execution } from '../entities/execution/execution';
import { ExecutionRepository } from '../entities/execution/execution-repository';
import { UserStrikeRepository } from '../entities/user/user-strike-repository';

export interface ExecutionFormValues {
	repNumber?: number;
	weightKg?: number;
	durationMin?: number;
	durationSec?: number;
	distanceKm?: number;
}

export interface LogResult {
	strikeIncreased: boolean;
	strikeCount: number;
}

export class ExecutionLogService {
	private readonly executionRepo: ExecutionRepository;
	private readonly strikeRepo: UserStrikeRepository;

	constructor(private readonly db: Database) {
		this.executionRepo = new ExecutionRepository(db);
		this.strikeRepo = new UserStrikeRepository(db);
	}

	/**
	 * Logs a completed exercise set and records a workout strike for the user.
	 * Returns whether the streak counter increased and its new value.
	 */
	async log(
		username: string,
		workoutName: string,
		exerciseName: string,
		metrics: ExerciseMetric[],
		values: ExecutionFormValues,
	): Promise<LogResult> {
		const execution: Omit<Execution, 'id'> = {
			workoutName,
			exerciseName,
			timestamp: new Date().toISOString(),
			username,
			...(metrics.includes('reps') && values.repNumber !== undefined ? { repNumber: values.repNumber } : {}),
			...(metrics.includes('weight') && values.weightKg !== undefined ? { weightKg: values.weightKg } : {}),
			...(metrics.includes('duration') && values.durationMin !== undefined ? { durationMin: values.durationMin } : {}),
			...(metrics.includes('time') && values.durationSec !== undefined ? { durationSec: values.durationSec } : {}),
			...(metrics.includes('distance') && values.distanceKm !== undefined ? { distanceKm: values.distanceKm } : {}),
		};

		await this.executionRepo.add(execution);

		const { strike, increased } = await this.strikeRepo.recordLog(username);
		return { strikeIncreased: increased, strikeCount: strike.strikeCount };
	}
}
