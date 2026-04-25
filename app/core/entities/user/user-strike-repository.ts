import Database from '../../infra/database';
import type { UserStrike } from './user-strike';

const STORE = 'userStrike';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

class UserStrikeRepository {
	constructor(private readonly db: Database) {}

	async get(username: string): Promise<UserStrike | undefined> {
		return this.db.get<UserStrike>(STORE, username);
	}

	/**
	 * Records a new log entry for the user and updates the strike accordingly.
	 * Returns the updated UserStrike and whether the strike increased.
	 */
	async recordLog(username: string): Promise<{ strike: UserStrike; increased: boolean }> {
		const now = new Date();
		const existing = await this.get(username);

		if (!existing) {
			const strike: UserStrike = {
				username,
				strikeCount: 1,
				maxStrike: 1,
				updatedAt: now.toISOString(),
			};
			await this.db.put(STORE, strike);
			return { strike, increased: true };
		}

		const last = new Date(existing.updatedAt);
		const sameDay =
			now.getFullYear() === last.getFullYear() &&
			now.getMonth() === last.getMonth() &&
			now.getDate() === last.getDate();

		if (sameDay) {
			return { strike: existing, increased: false };
		}

		const msSinceLast = now.getTime() - last.getTime();
		const withinWindow = msSinceLast <= TWENTY_FOUR_HOURS_MS;

		if (!withinWindow) {
			const strike: UserStrike = {
				...existing,
				strikeCount: 1,
				updatedAt: now.toISOString(),
			};
			await this.db.put(STORE, strike);
			return { strike, increased: false };
		}

		const newCount = existing.strikeCount + 1;
		const newMax = newCount > existing.maxStrike ? newCount : existing.maxStrike;
		const strike: UserStrike = {
			...existing,
			strikeCount: newCount,
			maxStrike: newMax,
			updatedAt: now.toISOString(),
		};
		await this.db.put(STORE, strike);
		return { strike, increased: true };
	}
}

export { UserStrikeRepository };
