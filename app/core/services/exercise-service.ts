import Database from '../infra/database';
import type { Exercise } from '../entities/exercise/exercise';
import { WorkoutRepository } from '../entities/workout/workout-repository';
import { ExecutionRepository } from '../entities/execution/execution-repository';
import { ExerciseNoteRepository } from '../entities/exercise-note/exercise-note-repository';

export class ExerciseService {
	private readonly workoutRepo: WorkoutRepository;
	private readonly executionRepo: ExecutionRepository;
	private readonly noteRepo: ExerciseNoteRepository;

	constructor(private readonly db: Database) {
		this.workoutRepo = new WorkoutRepository(db);
		this.executionRepo = new ExecutionRepository(db);
		this.noteRepo = new ExerciseNoteRepository(db);
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

		await this.noteRepo.updateExerciseName(oldName, newName);
	}

	/** Removes an exercise and cascades the delete to its notes. */
	async delete(name: string): Promise<void> {
		await this.db.delete('exercise', name);
		await this.noteRepo.deleteByExercise(name);
	}
}
