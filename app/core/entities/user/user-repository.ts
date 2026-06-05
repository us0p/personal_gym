import Database from '../../infra/database';
import type { User } from './user';

const USER_STORE = 'users';

class UserAlreadyExistsError extends Error {
	constructor() {
		super('A user already exists. Only one user profile is allowed.');
		this.name = 'UserAlreadyExistsError';
	}
}

class UserNotFoundError extends Error {
	constructor() {
		super('No user profile exists.');
		this.name = 'UserNotFoundError';
	}
}

class UserRepository {
	constructor(private readonly db: Database) {}

	/** Creates the user. Throws UserAlreadyExistsError if a user already exists. */
	async create(user: User): Promise<void> {
		if (await this.exists()) {
			throw new UserAlreadyExistsError();
		}
		await this.db.add(USER_STORE, user);
	}

	/** Returns the single user, or undefined if none exists. */
	async get(): Promise<User | undefined> {
		const all = await this.db.getAll<User>(USER_STORE);
		return all[0];
	}

	/**
	 * Updates the existing user's profile.
	 * Throws UserNotFoundError if no user exists.
	 * Throws if attempting to change the username.
	 */
	async update(user: User): Promise<void> {
		const existing = await this.get();
		if (!existing) {
			throw new UserNotFoundError();
		}
		if (existing.username !== user.username) {
			throw new Error('Username cannot be changed.');
		}
		await this.db.put(USER_STORE, user);
	}

	/** Removes the user. Silent if no user exists. */
	async delete(): Promise<void> {
		const user = await this.get();
		if (user) {
			await this.db.delete(USER_STORE, user.username);
		}
	}

	/** Returns true if a user exists. */
	async exists(): Promise<boolean> {
		return (await this.get()) !== undefined;
	}

	/** Updates strike and maxStrike on the user record. Throws UserNotFoundError if no user exists. */
	async updateStrike(username: string, strike: number, maxStrike: number): Promise<void> {
		const user = await this.get();
		if (!user || user.username !== username) throw new UserNotFoundError();
		await this.db.put(USER_STORE, { ...user, strike, maxStrike });
	}
}

export { UserRepository, UserAlreadyExistsError, UserNotFoundError };
