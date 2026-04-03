'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../core/entities/user/user';
import { UserRepository } from '../core/entities/user/user-repository';
import { UserWeightRepository } from '../core/entities/user/user-weight-repository';
import { UserProfileService } from '../core/entities/user/user-profile-service';
import Database from '../core/infra/database';

interface UserContextType {
	user: User | null;
	currentWeight: number | undefined;
	refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
	user: null,
	currentWeight: undefined,
	refreshUser: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [currentWeight, setCurrentWeight] = useState<number | undefined>(undefined);

	async function refreshUser() {
		const db = await Database.getInstance();
		const service = new UserProfileService(
			new UserRepository(db),
			new UserWeightRepository(db),
		);
		const profile = await service.getProfile();
		setUser(profile?.user ?? null);
		setCurrentWeight(profile?.weight);
	}

	useEffect(() => {
		refreshUser();
	}, []);

	return (
		<UserContext.Provider value={{ user, currentWeight, refreshUser }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
