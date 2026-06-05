import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { UserRepository, UserAlreadyExistsError, UserNotFoundError } from '../user-repository';
import { SexOptions } from '../user';

let factory: IDBFactory;
let db: Database;
let repo: UserRepository;

const sampleUser = {
	username: 'alice',
	sex: SexOptions.FEMALE,
	birthDate: new Date('1996-01-15'),
	height: 165,
	strike: 0,
	maxStrike: 0,
};

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	repo = new UserRepository(db);
});

afterEach(() => {
	db.close();
});

// ─── create() ────────────────────────────────────────────────────────────────

describe('create()', () => {
	it('creates a user when none exists', async () => {
		await repo.create(sampleUser);
		const stored = await repo.get();
		expect(stored).toEqual(sampleUser);
	});

	it('throws UserAlreadyExistsError when attempting to create a second user', async () => {
		await repo.create(sampleUser);
		await expect(
			repo.create({ ...sampleUser, username: 'bob' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError);
	});

	it('throws UserAlreadyExistsError even when re-creating the same user', async () => {
		await repo.create(sampleUser);
		await expect(repo.create(sampleUser)).rejects.toBeInstanceOf(UserAlreadyExistsError);
	});
});

// ─── get() ───────────────────────────────────────────────────────────────────

describe('get()', () => {
	it('returns undefined when no user exists', async () => {
		expect(await repo.get()).toBeUndefined();
	});

	it('returns the single user when one exists', async () => {
		await repo.create(sampleUser);
		const user = await repo.get();
		expect(user?.username).toBe('alice');
		expect(user?.birthDate).toEqual(new Date('1996-01-15'));
	});
});

// ─── update() ────────────────────────────────────────────────────────────────

describe('update()', () => {
	it('updates mutable profile fields', async () => {
		await repo.create(sampleUser);
		await repo.update({ ...sampleUser, height: 166, birthDate: new Date('1996-06-20') });
		const user = await repo.get();
		expect(user?.height).toBe(166);
		expect(user?.birthDate).toEqual(new Date('1996-06-20'));
	});

	it('throws UserNotFoundError when no user exists', async () => {
		await expect(repo.update(sampleUser)).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it('throws when attempting to change the username', async () => {
		await repo.create(sampleUser);
		await expect(
			repo.update({ ...sampleUser, username: 'differentname' }),
		).rejects.toThrow();
	});
});

// ─── delete() ────────────────────────────────────────────────────────────────

describe('delete()', () => {
	it('removes the existing user', async () => {
		await repo.create(sampleUser);
		await repo.delete();
		expect(await repo.get()).toBeUndefined();
	});

	it('is silent when no user exists', async () => {
		await expect(repo.delete()).resolves.toBeUndefined();
	});

	it('allows creating a new user after deletion', async () => {
		await repo.create(sampleUser);
		await repo.delete();
		await expect(
			repo.create({ ...sampleUser, username: 'newuser' }),
		).resolves.toBeUndefined();
	});
});

// ─── updateStrike() ──────────────────────────────────────────────────────────

describe('updateStrike()', () => {
	it('updates strike and maxStrike on the user record', async () => {
		await repo.create(sampleUser);
		await repo.updateStrike('alice', 7, 10);
		const user = await repo.get();
		expect(user?.strike).toBe(7);
		expect(user?.maxStrike).toBe(10);
	});

	it('throws UserNotFoundError when no user exists', async () => {
		await expect(repo.updateStrike('alice', 1, 1)).rejects.toBeInstanceOf(UserNotFoundError);
	});
});

// ─── exists() ────────────────────────────────────────────────────────────────

describe('exists()', () => {
	it('returns false when no user exists', async () => {
		expect(await repo.exists()).toBe(false);
	});

	it('returns true when a user exists', async () => {
		await repo.create(sampleUser);
		expect(await repo.exists()).toBe(true);
	});

	it('returns false after the user is deleted', async () => {
		await repo.create(sampleUser);
		await repo.delete();
		expect(await repo.exists()).toBe(false);
	});
});
