import Database from '../infra/database';
import type { Workout } from '../entities/workout/workout';
import { WorkoutRepository } from '../entities/workout/workout-repository';
import { ExecutionRepository } from '../entities/execution/execution-repository';
import { ExerciseNoteRepository } from '../entities/exercise-note/exercise-note-repository';

export class WorkoutService {
	private readonly workoutRepo: WorkoutRepository;
	private readonly executionRepo: ExecutionRepository;
	private readonly noteRepo: ExerciseNoteRepository;

	constructor(private readonly db: Database) {
		this.workoutRepo = new WorkoutRepository(db);
		this.executionRepo = new ExecutionRepository(db);
		this.noteRepo = new ExerciseNoteRepository(db);
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

		await this.noteRepo.updateWorkoutName(oldName, newName);
	}

	/** Removes a workout and cascades the delete to its notes. */
	async delete(name: string): Promise<void> {
		await this.workoutRepo.delete(name);
		await this.noteRepo.deleteByWorkout(name);
	}
}
