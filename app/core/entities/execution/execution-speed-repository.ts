import Database from '../../infra/database';
import type { ExecutionSpeed } from './execution-speed';

const STORE = 'executionSpeed';

class ExecutionSpeedRepository {
	constructor(private readonly db: Database) {}

	/** Saves a new execution speed entry. */
	async add(entry: Omit<ExecutionSpeed, 'id'>): Promise<void> {
		await this.db.add(STORE, entry);
	}

	/** Returns all execution speed entries. */
	async getAll(): Promise<ExecutionSpeed[]> {
		return this.db.getAll<ExecutionSpeed>(STORE);
	}
}

export { ExecutionSpeedRepository };
