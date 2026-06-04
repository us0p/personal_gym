import Database from '../../infra/database';
import type { ExerciseNote } from './exercise-note';

const STORE = 'exerciseNote';

export class ExerciseNoteRepository {
	constructor(private readonly db: Database) {}

	async add(note: Omit<ExerciseNote, 'id'>): Promise<number> {
		return this.db.addGetKey(STORE, note) as Promise<number>;
	}

	async getByWorkoutAndExercise(workoutName: string, exerciseName: string): Promise<ExerciseNote[]> {
		const all = await this.db.getAll<ExerciseNote>(STORE);
		return all
			.filter((n) => n.workoutName === workoutName && n.exerciseName === exerciseName)
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	async update(note: ExerciseNote): Promise<void> {
		await this.db.put(STORE, note);
	}

	async delete(id: number): Promise<void> {
		await this.db.delete(STORE, id);
	}

	async deleteByExercise(exerciseName: string): Promise<void> {
		const all = await this.db.getAll<ExerciseNote>(STORE);
		for (const note of all) {
			if (note.exerciseName === exerciseName) {
				await this.db.delete(STORE, note.id!);
			}
		}
	}

	async deleteByWorkout(workoutName: string): Promise<void> {
		const all = await this.db.getAll<ExerciseNote>(STORE);
		for (const note of all) {
			if (note.workoutName === workoutName) {
				await this.db.delete(STORE, note.id!);
			}
		}
	}

	async updateExerciseName(oldName: string, newName: string): Promise<void> {
		const all = await this.db.getAll<ExerciseNote>(STORE);
		for (const note of all) {
			if (note.exerciseName === oldName) {
				await this.db.put(STORE, { ...note, exerciseName: newName });
			}
		}
	}

	async updateWorkoutName(oldName: string, newName: string): Promise<void> {
		const all = await this.db.getAll<ExerciseNote>(STORE);
		for (const note of all) {
			if (note.workoutName === oldName) {
				await this.db.put(STORE, { ...note, workoutName: newName });
			}
		}
	}
}
