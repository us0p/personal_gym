import { SexOptions, User } from './user';
import { UserRepository, UserNotFoundError } from './user-repository';
import { UserWeightRepository } from './user-weight-repository';

interface UserProfileInput {
	username: string;
	sex: SexOptions;
	birthDate: Date;
	height: number;
	weight?: number;
}

interface UserProfile {
	user: User;
	weight: number | undefined;
}

class UserProfileService {
	constructor(
		private readonly userRepo: UserRepository,
		private readonly weightRepo: UserWeightRepository,
	) {}

	/**
	 * Creates the user profile. If weight is provided, the first weight
	 * progression entry is recorded at the same time.
	 */
	async create(input: UserProfileInput): Promise<void> {
		const { weight, ...userData } = input;
		await this.userRepo.create(userData);
		if (weight !== undefined) {
			await this.weightRepo.add({
				username: userData.username,
				createdAt: new Date(),
				weight,
			});
		}
	}

	/**
	 * Returns the user profile combined with the latest known weight,
	 * or undefined if no user has been created yet.
	 */
	async getProfile(): Promise<UserProfile | undefined> {
		const user = await this.userRepo.get();
		if (!user) return undefined;
		const latest = await this.weightRepo.getLatest(user.username);
		return { user, weight: latest?.weight };
	}

	/**
	 * Records a new weight measurement for the existing user.
	 * Throws UserNotFoundError if no user exists.
	 */
	async updateWeight(weight: number): Promise<void> {
		const user = await this.userRepo.get();
		if (!user) throw new UserNotFoundError();
		await this.weightRepo.add({
			username: user.username,
			createdAt: new Date(),
			weight,
		});
	}

	/**
	 * Updates the user's profile fields. If weight is provided, a new weight
	 * progression entry is recorded.
	 * Throws UserNotFoundError if no user exists.
	 */
	async updateProfile(input: Omit<UserProfileInput, 'username'>): Promise<void> {
		const user = await this.userRepo.get();
		if (!user) throw new UserNotFoundError();
		const { weight, ...profileData } = input;
		await this.userRepo.update({ username: user.username, ...profileData });
		if (weight !== undefined) {
			await this.weightRepo.add({
				username: user.username,
				createdAt: new Date(),
				weight,
			});
		}
	}
}

export { UserProfileService };
export type { UserProfileInput, UserProfile };
