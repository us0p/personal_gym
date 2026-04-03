import Database from '../../infra/database';
import { Workout, WeekDay } from './workout';

const STORE = 'workout';

class WorkoutRepository {
	constructor(private readonly db: Database) {}

	/** Inserts a new workout. Rejects if a workout with the same name already exists. */
	async add(workout: Workout): Promise<void> {
		await this.db.add(STORE, workout);
	}

	/** Returns a single workout by name, or undefined if not found. */
	async get(name: string): Promise<Workout | undefined> {
		return this.db.get<Workout>(STORE, name);
	}

	/** Returns all workouts. */
	async getAll(): Promise<Workout[]> {
		return this.db.getAll<Workout>(STORE);
	}

	/** Returns workouts assigned to a specific day of the week. */
	async getByWeekDay(day: WeekDay): Promise<Workout[]> {
		const all = await this.getAll();
		return all.filter((w) => w.weekDay === day);
	}

	/** Replaces an existing workout record (upsert). */
	async update(workout: Workout): Promise<void> {
		await this.db.put(STORE, workout);
	}

	/** Removes a workout by name. Silent if not found. */
	async delete(name: string): Promise<void> {
		await this.db.delete(STORE, name);
	}
}

export { WorkoutRepository };
