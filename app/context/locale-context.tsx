'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
	const [manualLocale, setManualLocale] = useState<Locale | null>(null);

	// Derive the active locale: explicit user choice > stored user preference > browser default
	const userLocale = user?.locale && LOCALES.includes(user.locale as Locale) ? user.locale as Locale : null;
	const locale: Locale = manualLocale ?? userLocale ?? detectLocale();

	const setLocale = useCallback(async (newLocale: Locale) => {
		setManualLocale(newLocale);
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
