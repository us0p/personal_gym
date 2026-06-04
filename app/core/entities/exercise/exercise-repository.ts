import Database from '../../infra/database';
import type { Exercise } from './exercise';

const STORE = 'exercise';

class ExerciseRepository {
	constructor(private readonly db: Database) {}

	/** Returns all exercises. */
	async getAll(): Promise<Exercise[]> {
		return this.db.getAll<Exercise>(STORE);
	}

	/** Returns a single exercise by name, or undefined if not found. */
	async get(name: string): Promise<Exercise | undefined> {
		return this.db.get<Exercise>(STORE, name);
	}

	/** Inserts a new exercise. Throws if one with the same name already exists. */
	async add(exercise: Exercise): Promise<void> {
		await this.db.add(STORE, exercise);
	}

	/** Replaces an existing exercise record (upsert). */
	async update(exercise: Exercise): Promise<void> {
		await this.db.put(STORE, exercise);
	}

	/** Removes an exercise by name. Silent if not found. */
	async delete(name: string): Promise<void> {
		await this.db.delete(STORE, name);
	}
}

export { ExerciseRepository };
