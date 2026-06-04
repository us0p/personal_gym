import Database from '../infra/database';
import type { Workout } from '../entities/workout/workout';
import { WorkoutRepository } from '../entities/workout/workout-repository';
import { ExecutionRepository } from '../entities/execution/execution-repository';

export class WorkoutService {
	private readonly workoutRepo: WorkoutRepository;
	private readonly executionRepo: ExecutionRepository;

	constructor(private readonly db: Database) {
		this.workoutRepo = new WorkoutRepository(db);
		this.executionRepo = new ExecutionRepository(db);
	}

	/**
	 * Updates a workout. If the name changed, cascades the rename to all executions
	 * that reference the old name. Throws if newName already belongs to a different workout.
	 */
	async update(oldName: string, updated: Workout): Promise<void> {
		const newName = updated.name;
		if (oldName === newName) {
			await this.workoutRepo.update(updated);
			return;
		}

		await this.workoutRepo.delete(oldName);
		await this.workoutRepo.add(updated);

		const allExecutions = await this.executionRepo.getAll();
		for (const exec of allExecutions) {
			if (exec.workoutName === oldName) {
				await this.db.put('execution', { ...exec, workoutName: newName });
			}
		}
	}

	/** Removes a workout by name. Does not cascade to executions. */
	async delete(name: string): Promise<void> {
		await this.workoutRepo.delete(name);
	}
}
