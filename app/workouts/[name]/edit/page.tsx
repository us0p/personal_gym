'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../../core/infra/database';
import { Workout, WeekDay } from '../../../core/entities/workout/workout';
import { WorkoutRepository } from '../../../core/entities/workout/workout-repository';
import { ExecutionRepository } from '../../../core/entities/execution/execution-repository';
import { ExecutionRestRepository } from '../../../core/entities/execution/execution-rest-repository';
import { Exercise } from '../../../core/entities/exercise/exercise';
import { WEEK_DAYS } from '../../../core/entities/workout/week-day-labels';
import { inputClass } from '../../../lib/styles';

export default function EditWorkoutPage() {
	const params = useParams();
	const router = useRouter();
	const name = decodeURIComponent(params.name as string);
	const [workout, setWorkout] = useState<Workout | null>(null);
	const [exercises, setExercises] = useState<Exercise[]>([]);

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
		}
		load();
	}, [name]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!workout) return;
		const form = new FormData(e.currentTarget);
		const newName = (form.get('name') as string).trim();
		const weekDays = form.getAll('weekDays') as WeekDay[];
		const updated: Workout = {
			name: newName,
			exercises: form.getAll('exercises') as string[],
			username: workout.username,
			weekDays: weekDays.length > 0 ? weekDays : undefined,
		};
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		try {
			if (newName !== workout.name) {
				await repo.delete(workout.name);
				await repo.add(updated);

				const execRepo = new ExecutionRepository(db);
				const allExecutions = await execRepo.getAll();
				for (const exec of allExecutions) {
					if (exec.workoutName === workout.name) {
						await db.put('execution', { ...exec, workoutName: newName });
					}
				}

				const restRepo = new ExecutionRestRepository(db);
				const allRests = await restRepo.getAll();
				for (const rest of allRests) {
					if (rest.workoutName === workout.name) {
						await db.put('executionRest', { ...rest, workoutName: newName });
					}
				}
			} else {
				await repo.update(updated);
			}
			router.push(`/workouts/${encodeURIComponent(newName)}`);
		} catch {
			alert('A workout with that name already exists.');
		}
	}

	async function handleDelete() {
		if (!confirm(`Delete "${name}"?`)) return;
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		await repo.delete(name);
		router.push('/workouts');
	}

	if (!workout) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">Loading…</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<h1 className="text-2xl font-bold">Edit Workout</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">Delete</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						defaultValue={workout.name}
						placeholder="Workout name"
						className={inputClass}
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">Days of the Week</label>
						<div className="flex gap-2">
							{WEEK_DAYS.map(({ value, label }) => (
								<label key={value} className="flex-1 cursor-pointer">
									<input
										type="checkbox"
										name="weekDays"
										value={value}
										defaultChecked={workout.weekDays?.includes(value) ?? false}
										className="sr-only peer"
									/>
									<div className="text-center py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-semibold peer-checked:bg-white peer-checked:text-black transition-colors">
										{label}
									</div>
								</label>
							))}
						</div>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">Exercises</label>
						{exercises.length === 0 ? (
							<p className="text-zinc-500 text-sm">No exercises available.</p>
						) : (
							<div className="space-y-2">
								{exercises.map((ex) => (
									<label key={ex.name} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 cursor-pointer active:bg-zinc-800">
										<input
											type="checkbox"
											name="exercises"
											value={ex.name}
											defaultChecked={workout.exercises.includes(ex.name)}
											className="w-4 h-4 accent-white"
										/>
										<div>
											<p className="text-sm font-semibold">{ex.name}</p>
											<p className="text-xs text-zinc-500 capitalize">
												{ex.type}{ex.bodyRegion.length > 0 ? ` · ${ex.bodyRegion.join(', ')}` : ''}
											</p>
										</div>
									</label>
								))}
							</div>
						)}
					</div>

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base">
						Save Changes
					</button>
				</form>
			</div>
		</div>
	);
}
