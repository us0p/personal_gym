'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../../core/infra/database';
import { Workout } from '../../../core/entities/workout/workout';
import { WorkoutRepository } from '../../../core/entities/workout/workout-repository';
import { WorkoutService } from '../../../core/services/workout-service';
import { Exercise, METRICS_BY_TYPE } from '../../../core/entities/exercise/exercise';
import { useLocale } from '../../../context/locale-context';
import { inputClass } from '../../../lib/styles';
import { useWorkoutExerciseSelector } from '../../use-workout-exercise-selector';

export default function EditWorkoutPage() {
	const params = useParams();
	const router = useRouter();
	const { t } = useLocale();
	const name = decodeURIComponent(params.name as string);
	const [workout, setWorkout] = useState<Workout | null>(null);
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const { exerciseMetrics, toggleExercise, toggleMetric, setExercises: setSelectorExercises, getWorkoutExercises } = useWorkoutExerciseSelector();

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const repo = new WorkoutRepository(db);
			const [found, allExercises] = await Promise.all([
				repo.get(name),
				db.getAll<Exercise>('exercise'),
			]);
			setWorkout(found ?? null);
			setExercises(allExercises);
			if (found) setSelectorExercises(found.exercises);
		}
		void load();
	// setSelectorExercises is stable (from useState setter), safe to omit
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [name]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!workout) return;
		const form = new FormData(e.currentTarget);
		const newName = (form.get('name') as string).trim();
		const workoutExercises = getWorkoutExercises();
		const updated: Workout = {
			name: newName,
			exercises: workoutExercises,
			username: workout.username,
		};
		const db = await Database.getInstance();
		try {
			await new WorkoutService(db).update(workout.name, updated);
			router.push(`/workouts/${encodeURIComponent(newName)}`);
		} catch {
			alert(t('editWorkout.alreadyExists'));
		}
	}

	async function handleDelete() {
		if (!confirm(t('editWorkout.deleteConfirm', { name }))) return;
		const db = await Database.getInstance();
		await new WorkoutService(db).delete(name);
		router.push('/workouts');
	}

	if (!workout) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">{t('common.loading')}</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<h1 className="text-2xl font-bold">{t('editWorkout.title')}</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">{t('common.delete')}</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						defaultValue={workout.name}
						placeholder={t('editWorkout.namePlaceholder')}
						className={inputClass}
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">{t('editWorkout.exercises')}</label>
						{exercises.length === 0 ? (
							<p className="text-zinc-500 text-sm">{t('editWorkout.noExercises')}</p>
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
						{t('editWorkout.submit')}
					</button>
				</form>
			</div>
		</div>
	);
}
