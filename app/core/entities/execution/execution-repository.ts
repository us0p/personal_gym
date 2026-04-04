import Database from '../../infra/database';
import type { Execution } from './execution';

const STORE = 'execution';

class ExecutionRepository {
	constructor(private readonly db: Database) {}

	/** Saves a new execution log entry and returns its generated id. */
	async add(execution: Omit<Execution, 'id'>): Promise<number> {
		return this.db.addGetKey(STORE, execution) as Promise<number>;
	}

	/** Returns all executions sorted by timestamp descending (most recent first). */
	async getAll(): Promise<Execution[]> {
		const all = await this.db.getAll<Execution>(STORE);
		return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	/**
	 * Returns executions for a specific workout, sorted by timestamp descending.
	 */
	async getByWorkout(workoutName: string): Promise<Execution[]> {
		const all = await this.getAll();
		return all.filter((e) => e.workoutName === workoutName);
	}

	/**
	 * Returns executions for a specific workout and exercise, sorted by timestamp descending.
	 */
	async getByWorkoutAndExercise(workoutName: string, exerciseName: string): Promise<Execution[]> {
		const all = await this.getAll();
		return all.filter((e) => e.workoutName === workoutName && e.exerciseName === exerciseName);
	}

	/** Removes an execution by its auto-incremented id. Silent if not found. */
	async delete(id: number): Promise<void> {
		await this.db.delete(STORE, id);
	}
}

export { ExecutionRepository };
