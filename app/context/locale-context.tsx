'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { LOCALES, Locale, translations, detectLocale, interpolate } from '../i18n/translations';
import { useUser } from './user-context';
import Database from '../core/infra/database';
import { UserRepository } from '../core/entities/user/user-repository';

interface LocaleContextType {
	locale: Locale;
	setLocale: (locale: Locale) => Promise<void>;
	t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType>({
	locale: 'en',
	setLocale: async () => {},
	t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
	const { user, refreshUser } = useUser();
	const [locale, setLocaleState] = useState<Locale>(detectLocale);

	// When user loads or changes, apply their stored locale preference
	useEffect(() => {
		const stored = user?.locale;
		if (stored && LOCALES.includes(stored as Locale)) {
			setLocaleState(stored as Locale);
		}
	}, [user?.locale]);

	const setLocale = useCallback(async (newLocale: Locale) => {
		setLocaleState(newLocale);
		if (!user) return;
		try {
			const db = await Database.getInstance();
			const repo = new UserRepository(db);
			const current = await repo.get();
			if (current) {
				await repo.update({ ...current, locale: newLocale });
				await refreshUser();
			}
		} catch {
			// Silent fail — locale stays updated in state
		}
	}, [user, refreshUser]);

	const t = useCallback((key: string, params?: Record<string, string | number>): string => {
		const dict = translations[locale] ?? translations['en'];
		const template = dict[key] ?? key;
		return params ? interpolate(template, params) : template;
	}, [locale]);

	return (
		<LocaleContext.Provider value={{ locale, setLocale, t }}>
			{children}
		</LocaleContext.Provider>
	);
}

export function useLocale() {
	return useContext(LocaleContext);
}
