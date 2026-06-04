'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Database from '../../core/infra/database';
import { Workout, WeekDay } from '../../core/entities/workout/workout';
import { WorkoutRepository } from '../../core/entities/workout/workout-repository';
import { Exercise, METRICS_BY_TYPE } from '../../core/entities/exercise/exercise';
import { useUser } from '../../context/user-context';
import { useLocale } from '../../context/locale-context';
import { WEEK_DAYS } from '../../core/entities/workout/week-day-labels';
import { inputClass } from '../../lib/styles';
import { useWorkoutExerciseSelector } from '../use-workout-exercise-selector';

export default function NewWorkoutPage() {
	const router = useRouter();
	const { user } = useUser();
	const { t } = useLocale();
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const { exerciseMetrics, toggleExercise, toggleMetric, getWorkoutExercises } = useWorkoutExerciseSelector();

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			setExercises(await db.getAll<Exercise>('exercise'));
		}
		void load();
	}, []);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) {
			alert(t('newWorkout.noProfile'));
			router.push('/users/new');
			return;
		}
		const form = new FormData(e.currentTarget);
		const weekDays = form.getAll('weekDays') as WeekDay[];
		const workoutExercises = getWorkoutExercises();
		const workout: Workout = {
			name: form.get('name') as string,
			exercises: workoutExercises,
			username: user.username,
			weekDays: weekDays.length > 0 ? weekDays : undefined,
		};
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		try {
			await repo.add(workout);
			router.push('/workouts');
		} catch {
			alert(t('newWorkout.alreadyExists'));
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">{t('newWorkout.title')}</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						placeholder={t('newWorkout.namePlaceholder')}
						className={inputClass}
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">{t('newWorkout.daysOfWeek')}</label>
						<div className="flex gap-2">
							{WEEK_DAYS.map(({ value, label }) => (
								<label key={value} className="flex-1 cursor-pointer">
									<input type="checkbox" name="weekDays" value={value} className="sr-only peer" />
									<div className="text-center py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold peer-checked:bg-white peer-checked:text-black transition-colors">
										{t(`weekDay.${label}`)}
									</div>
								</label>
							))}
						</div>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">{t('newWorkout.exercises')}</label>
						{exercises.length === 0 ? (
							<div className="bg-zinc-900 rounded-xl p-4 text-center">
								<p className="text-zinc-500 text-sm">{t('newWorkout.noExercises')}</p>
								<Link href="/exercises/new" className="text-white text-sm underline mt-1 inline-block">
									{t('newWorkout.createExercise')}
								</Link>
							</div>
						) : (
							<div className="space-y-2">
								{exercises.map((ex) => {
									const isSelected = exerciseMetrics.has(ex.name);
									const selectedMetrics = exerciseMetrics.get(ex.name) ?? [];
									const availableMetrics = METRICS_BY_TYPE[ex.type];
									return (
										<div key={ex.name} className="bg-zinc-900 rounded-xl overflow-hidden">
											<label className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-zinc-800">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={(e) => toggleExercise(ex, e.target.checked)}
													className="w-4 h-4 accent-white shrink-0"
												/>
												<div>
													<p className="text-sm font-semibold">{ex.name}</p>
													<p className="text-xs text-zinc-500 capitalize">
														{t(`exerciseType.${ex.type}`)}
														{ex.bodyRegion.length > 0 ? ` · ${ex.bodyRegion.map((r) => t(`bodyRegion.${r}`)).join(', ')}` : ''}
													</p>
												</div>
											</label>
											{isSelected && (
												<div className="px-4 pb-3 flex gap-2 flex-wrap">
													{availableMetrics.map((metric) => {
														const active = selectedMetrics.includes(metric);
														return (
															<button
																key={metric}
																type="button"
																onClick={() => toggleMetric(ex.name, metric, selectedMetrics)}
																className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${active ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
															>
																{t(`metric.${metric}`)}
															</button>
														);
													})}
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base">
						{t('newWorkout.submit')}
					</button>
				</form>
			</div>
		</div>
	);
}
