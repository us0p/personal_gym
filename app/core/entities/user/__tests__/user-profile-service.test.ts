import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Database from '../../../infra/database';
import { UserRepository, UserAlreadyExistsError, UserNotFoundError } from '../user-repository';
import { UserWeightRepository } from '../user-weight-repository';
import { UserProfileService } from '../user-profile-service';
import { SexOptions } from '../user';

let factory: IDBFactory;
let db: Database;
let service: UserProfileService;
let weightRepo: UserWeightRepository;

const baseUser = {
	username: 'alice',
	sex: SexOptions.FEMALE,
	birthDate: new Date('1996-01-15'),
	height: 165,
};

beforeEach(async () => {
	factory = new IDBFactory();
	db = await Database.createInstance(factory);
	const userRepo = new UserRepository(db);
	weightRepo = new UserWeightRepository(db);
	service = new UserProfileService(userRepo, weightRepo);
});

afterEach(() => {
	db.close();
});

// ─── create() ────────────────────────────────────────────────────────────────

describe('create()', () => {
	it('creates the user', async () => {
		await service.create(baseUser);
		const profile = await service.getProfile();
		expect(profile?.user.username).toBe('alice');
	});

	it('creates a weight entry when weight is provided', async () => {
		await service.create({ ...baseUser, weight: 72 });
		const profile = await service.getProfile();
		expect(profile?.weight).toBe(72);
	});

	it('does not create a weight entry when weight is omitted', async () => {
		await service.create(baseUser);
		const profile = await service.getProfile();
		expect(profile?.weight).toBeUndefined();
	});

	it('throws UserAlreadyExistsError when a user already exists', async () => {
		await service.create(baseUser);
		await expect(
			service.create({ ...baseUser, username: 'bob' }),
		).rejects.toBeInstanceOf(UserAlreadyExistsError);
	});
});

// ─── getProfile() ────────────────────────────────────────────────────────────

describe('getProfile()', () => {
	it('returns undefined when no user exists', async () => {
		expect(await service.getProfile()).toBeUndefined();
	});

	it('returns weight as undefined when no weight entries exist', async () => {
		await service.create(baseUser);
		const profile = await service.getProfile();
		expect(profile?.user.username).toBe('alice');
		expect(profile?.weight).toBeUndefined();
	});

	it('returns the most recent weight from multiple entries', async () => {
		await service.create(baseUser);
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 72 });
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-03-01'), weight: 68 });
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-02-01'), weight: 70 });

		const profile = await service.getProfile();
		expect(profile?.weight).toBe(68); // 2026-03-01 is the most recent
	});
});

// ─── updateWeight() ──────────────────────────────────────────────────────────

describe('updateWeight()', () => {
	it('throws UserNotFoundError when no user exists', async () => {
		await expect(service.updateWeight(70)).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it('adds a weight entry that is visible in getProfile', async () => {
		await service.create(baseUser);
		// Seed a past entry so we can verify the new one takes precedence by date
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 72 });

		await service.updateWeight(68); // createdAt: now (> 2026-01-01)
		const profile = await service.getProfile();
		expect(profile?.weight).toBe(68);
	});

	it('accumulates entries in the weight progression', async () => {
		await service.create(baseUser);
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-01-01'), weight: 72 });
		await weightRepo.add({ username: 'alice', createdAt: new Date('2026-02-01'), weight: 70 });

		await service.updateWeight(68); // third entry
		const all = await weightRepo.getAllByUser('alice');
		expect(all).toHaveLength(3);
	});

	it('successive updateWeight calls keep the last as latest', async () => {
		await service.create(baseUser);
		// Both calls use new Date() — rely on id as tiebreaker in getLatest
		await service.updateWeight(70);
		await service.updateWeight(68);

		const profile = await service.getProfile();
		expect(profile?.weight).toBe(68);
	});
});

// ─── updateProfile() ─────────────────────────────────────────────────────────

describe('updateProfile()', () => {
	it('throws UserNotFoundError when no user exists', async () => {
		await expect(service.updateProfile(baseUser)).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it('updates user fields without touching weight', async () => {
		await service.create({ ...baseUser, weight: 72 });
		await service.updateProfile({ ...baseUser, height: 170 });
		const profile = await service.getProfile();
		expect(profile?.user.height).toBe(170);
		expect(profile?.weight).toBe(72); // weight unchanged
	});

	it('adds a weight entry when weight is provided', async () => {
		await service.create(baseUser);
		await service.updateProfile({ ...baseUser, weight: 65 });
		const profile = await service.getProfile();
		expect(profile?.weight).toBe(65);
	});

	it('does not add a weight entry when weight is omitted', async () => {
		await service.create(baseUser);
		await service.updateProfile(baseUser);
		const all = await weightRepo.getAllByUser('alice');
		expect(all).toHaveLength(0);
	});

	it('preserves prior weight entries when updating profile without weight', async () => {
		await service.create({ ...baseUser, weight: 72 });
		await service.updateProfile({ ...baseUser, height: 170 }); // no new weight
		const all = await weightRepo.getAllByUser('alice');
		expect(all).toHaveLength(1);
		expect(all[0].weight).toBe(72);
	});
});
