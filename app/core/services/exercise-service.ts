import Database from '../infra/database';
import type { Exercise } from '../entities/exercise/exercise';
import { WorkoutRepository } from '../entities/workout/workout-repository';
import { ExecutionRepository } from '../entities/execution/execution-repository';

export class ExerciseService {
	private readonly workoutRepo: WorkoutRepository;
	private readonly executionRepo: ExecutionRepository;

	constructor(private readonly db: Database) {
		this.workoutRepo = new WorkoutRepository(db);
		this.executionRepo = new ExecutionRepository(db);
	}

	/**
	 * Renames an exercise and cascades the change to all workouts and executions that
	 * reference the old name. Throws if a different exercise already uses newName.
	 */
	async rename(oldName: string, updated: Exercise): Promise<void> {
		const newName = updated.name;
		if (oldName === newName) {
			await this.db.put('exercise', updated);
			return;
		}

		await this.db.delete('exercise', oldName);
		await this.db.add('exercise', updated);

		const allWorkouts = await this.workoutRepo.getAll();
		for (const w of allWorkouts) {
			if (w.exercises.some((we) => we.name === oldName)) {
				await this.workoutRepo.update({
					...w,
					exercises: w.exercises.map((we) => we.name === oldName ? { ...we, name: newName } : we),
				});
			}
		}

		const allExecutions = await this.executionRepo.getAll();
		for (const exec of allExecutions) {
			if (exec.exerciseName === oldName) {
				await this.db.put('execution', { ...exec, exerciseName: newName });
			}
		}
	}

	/** Removes an exercise by name. Does not cascade to workouts or executions. */
	async delete(name: string): Promise<void> {
		await this.db.delete('exercise', name);
	}
}
