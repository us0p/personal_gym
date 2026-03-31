'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../core/entities/user/user';

interface UserContextType {
	currentUser: User | null;
	setCurrentUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType>({
	currentUser: null,
	setCurrentUser: () => {},
});

const STORAGE_KEY = 'gym_current_user';

export function UserProvider({ children }: { children: ReactNode }) {
	const [currentUser, setCurrentUserState] = useState<User | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				setCurrentUserState(JSON.parse(stored));
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	}, []);

	function setCurrentUser(user: User | null) {
		setCurrentUserState(user);
		if (user) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	return (
		<UserContext.Provider value={{ currentUser, setCurrentUser }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
