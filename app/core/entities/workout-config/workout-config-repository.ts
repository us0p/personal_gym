import Database from '../../infra/database';
import type { WorkoutConfig, WorkoutConfigTracking } from './workout-config';

const STORE = 'workoutConfig';

class WorkoutConfigRepository {
	constructor(private readonly db: Database) {}

	async get(username: string): Promise<WorkoutConfig | undefined> {
		return this.db.get<WorkoutConfig>(STORE, username);
	}

	async upsert(config: WorkoutConfig): Promise<void> {
		await this.db.put(STORE, config);
	}

	async resetTracking(username: string): Promise<void> {
		const config = await this.get(username);
		if (!config) return;
		await this.db.put(STORE, { ...config, tracking: null });
	}

	async updateTracking(username: string, tracking: WorkoutConfigTracking): Promise<void> {
		const config = await this.get(username);
		if (!config) return;
		await this.db.put(STORE, { ...config, tracking });
	}
}

export { WorkoutConfigRepository };
