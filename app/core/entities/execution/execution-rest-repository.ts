import Database from '../../infra/database';
import type { ExecutionRest } from './execution-rest';

const STORE = 'executionRest';

class ExecutionRestRepository {
	constructor(private readonly db: Database) {}

	/** Saves a new rest entry. */
	async add(rest: Omit<ExecutionRest, 'id'>): Promise<void> {
		await this.db.add(STORE, rest);
	}

	/** Returns all rest entries for a specific execution id. */
	async getByExecution(executionId: number): Promise<ExecutionRest[]> {
		const all = await this.db.getAll<ExecutionRest>(STORE);
		return all.filter((r) => r.executionId === executionId);
	}

	/** Returns all rest entries. */
	async getAll(): Promise<ExecutionRest[]> {
		return this.db.getAll<ExecutionRest>(STORE);
	}
}

export { ExecutionRestRepository };
