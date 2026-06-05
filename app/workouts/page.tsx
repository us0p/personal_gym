'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Database from '../core/infra/database';
import { Workout } from '../core/entities/workout/workout';
import { WorkoutRepository } from '../core/entities/workout/workout-repository';
import { WorkoutConfigRepository } from '../core/entities/workout-config/workout-config-repository';
import { DAY_LABEL_SHORT } from '../core/entities/workout/week-day-labels';
import { useUser } from '../context/user-context';
import { useLocale } from '../context/locale-context';

function CogIcon() {
	return (
		<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
		</svg>
	);
}

export default function WorkoutsPage() {
	const { user } = useUser();
	const { t } = useLocale();
	const router = useRouter();
	const [workouts, setWorkouts] = useState<Workout[]>([]);
	const [showConfigPrompt, setShowConfigPrompt] = useState(false);

	useEffect(() => {
		if (!user) return;
		async function load() {
			const db = await Database.getInstance();
			const [allWorkouts, config] = await Promise.all([
				new WorkoutRepository(db).getAll(),
				new WorkoutConfigRepository(db).get(user!.username),
			]);
			setWorkouts(allWorkouts);
			setShowConfigPrompt(allWorkouts.length > 0 && !config);
		}
		void load();
	}, [user]);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">{t('workouts.title')}</h1>
					<div className="flex items-center gap-2">
						<button
							onClick={() => router.push('/workout-config')}
							className="text-zinc-400 hover:text-white transition-colors p-1"
							aria-label="Configure routine"
						>
							<CogIcon />
						</button>
						<Link href="/workouts/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
							{t('workouts.new')}
						</Link>
					</div>
				</div>

				{showConfigPrompt && (
					<div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
						<p className="text-sm text-zinc-300">{t('routine.configMissing')}</p>
						<button
							onClick={() => router.push('/workout-config')}
							className="shrink-0 bg-white text-black text-xs font-bold rounded-lg px-3 py-2"
						>
							{t('routine.configMissingCta')}
						</button>
					</div>
				)}

				<div className="space-y-3">
					{workouts.length === 0 && (
						<p className="text-zinc-500 text-center py-12">{t('workouts.empty')}</p>
					)}
					{workouts.map((w) => (
						<div key={w.name} className="bg-zinc-900 rounded-2xl p-4">
							<div className="flex items-start justify-between">
								<Link
									href={`/workouts/${encodeURIComponent(w.name)}`}
									className="flex-1 min-w-0"
								>
									<div className="flex items-center gap-2 flex-wrap">
										<p className="font-semibold text-lg truncate">{w.name}</p>
										{w.weekDays?.map((day) => (
											<span key={day} className="shrink-0 text-xs bg-zinc-700 text-zinc-300 rounded-full px-2.5 py-0.5 font-semibold">
												{t(`weekDay.${DAY_LABEL_SHORT[day]}`)}
											</span>
										))}
									</div>
									<p className="text-zinc-400 text-sm mt-0.5">
										{w.exercises.length === 1
											? t('workouts.exerciseCount_one', { count: w.exercises.length })
											: t('workouts.exerciseCount_other', { count: w.exercises.length })}
									</p>
								</Link>
								<Link
									href={`/workouts/${encodeURIComponent(w.name)}/edit`}
									className="shrink-0 text-sm text-zinc-500 font-medium ml-4 mt-0.5"
								>
									{t('common.edit')}
								</Link>
							</div>
							{w.exercises.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-3">
									{w.exercises.map((we) => (
										<span key={we.name} className="text-xs bg-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 font-medium">
											{we.name}
										</span>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
