import Database from '../../infra/database';
import type { UserWeightEntry } from './user-weight-entry';

const STORE = 'userWeightProgression';

class UserWeightRepository {
	constructor(private readonly db: Database) {}

	/** Adds a new weight measurement for the user. */
	async add(entry: Omit<UserWeightEntry, 'id'>): Promise<void> {
		await this.db.add(STORE, entry);
	}

	/**
	 * Returns all weight entries for the given username,
	 * sorted by createdAt in ascending order.
	 */
	async getAllByUser(username: string): Promise<UserWeightEntry[]> {
		const all = await this.db.getAll<UserWeightEntry>(STORE);
		return all
			.filter((e) => e.username === username)
			.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
					(a.id ?? 0) - (b.id ?? 0),
			);
	}

	/** Returns the most recent weight entry for the given username, or undefined. */
	async getLatest(username: string): Promise<UserWeightEntry | undefined> {
		const sorted = await this.getAllByUser(username);
		return sorted[sorted.length - 1];
	}

	/** Removes a weight entry by its auto-incremented id. Silent if not found. */
	async delete(id: number): Promise<void> {
		await this.db.delete(STORE, id);
	}
}

export { UserWeightRepository };
