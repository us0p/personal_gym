'use client'

import { useEffect, useRef, useState } from 'react';
import { useUser } from './context/user-context';
import { useLocale } from './context/locale-context';
import { LOCALES, type Locale } from './i18n/translations';
import Database from './core/infra/database';
import { UserWeightRepository } from './core/entities/user/user-weight-repository';
import { UserStrikeRepository } from './core/entities/user/user-strike-repository';
import type { UserWeightEntry } from './core/entities/user/user-weight-entry';
import type { UserStrike } from './core/entities/user/user-strike';
import WeightChart from './components/weight-chart';
import ExerciseProgressionChart from './components/exercise-progression-chart';

function GlobeIcon() {
	return (
		<svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
		</svg>
	);
}

function ChevronDownIcon({ open }: { open: boolean }) {
	return (
		<svg
			className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.5}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	);
}

function LanguagePicker() {
	const { locale, setLocale, t } = useLocale();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handleOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, [open]);

	return (
		<div ref={ref} className="relative shrink-0">
			<button
				onClick={() => setOpen((v) => !v)}
				aria-label={t('lang.label')}
				aria-expanded={open}
				aria-haspopup="listbox"
				data-testid="lang-picker-button"
				className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 hover:bg-zinc-700 transition-colors"
			>
				<GlobeIcon />
				<span>{t(`lang.${locale}`)}</span>
				<ChevronDownIcon open={open} />
			</button>

			{open && (
				<div
					role="listbox"
					aria-label={t('lang.label')}
					className="absolute right-0 top-full mt-1.5 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl min-w-[130px] z-50"
				>
					{LOCALES.map((loc) => (
						<button
							key={loc}
							role="option"
							aria-selected={locale === loc}
							data-testid={`lang-option-${loc}`}
							onClick={() => { setLocale(loc as Locale); setOpen(false); }}
							className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
								locale === loc
									? 'text-white font-semibold bg-zinc-700'
									: 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
							}`}
						>
							{t(`lang.${loc}`)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default function Dashboard() {
	const { user } = useUser();
	const { t } = useLocale();
	const [weightHistory, setWeightHistory] = useState<UserWeightEntry[]>([]);
	const [strike, setStrike] = useState<UserStrike | null>(null);

	useEffect(() => {
		if (!user) return;
		async function loadData() {
			const db = await Database.getInstance();
			const [entries, userStrike] = await Promise.all([
				new UserWeightRepository(db).getAllByUser(user!.username),
				new UserStrikeRepository(db).get(user!.username),
			]);
			setWeightHistory(entries);
			setStrike(userStrike ?? null);
		}
		loadData();
	}, [user]);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-7">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{t('app.name')}</p>
						<h1 className="text-3xl font-bold mt-1">
							{user ? t('home.greeting', { username: user.username }) : t('home.welcome')}
						</h1>
					</div>
					<LanguagePicker />
				</div>

				{user && (
					<div className="flex items-center gap-4 bg-zinc-900 rounded-2xl px-5 py-4">
						<div className="flex-1">
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('home.strike')}</p>
							<p className="text-4xl font-bold tabular-nums mt-1">{t('home.strikeCount', { count: strike?.strikeCount ?? 0 })}</p>
							<p className="text-xs text-zinc-500 mt-1">{t('home.maxStrike', { max: strike?.maxStrike ?? 0 })}</p>
						</div>
						<span className="text-4xl select-none">🔥</span>
					</div>
				)}

				<WeightChart entries={weightHistory} />

				{user && <ExerciseProgressionChart username={user.username} />}
			</div>
		</div>
	);
}
