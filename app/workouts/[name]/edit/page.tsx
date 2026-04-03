'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../../core/infra/database';
import { Workout, WeekDay } from '../../../core/entities/workout/workout';
import { WorkoutRepository } from '../../../core/entities/workout/workout-repository';
import { Exercise } from '../../../core/entities/exercise/exercise';

const selectClass = "w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 appearance-none text-base";

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
	{ value: WeekDay.MONDAY, label: 'Monday' },
	{ value: WeekDay.TUESDAY, label: 'Tuesday' },
	{ value: WeekDay.WEDNESDAY, label: 'Wednesday' },
	{ value: WeekDay.THURSDAY, label: 'Thursday' },
	{ value: WeekDay.FRIDAY, label: 'Friday' },
	{ value: WeekDay.SATURDAY, label: 'Saturday' },
	{ value: WeekDay.SUNDAY, label: 'Sunday' },
];

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
		const weekDayRaw = form.get('weekDay') as string;
		const updated: Workout = {
			name: workout.name,
			exercises: form.getAll('exercises') as string[],
			username: workout.username,
			weekDay: weekDayRaw ? (weekDayRaw as WeekDay) : undefined,
		};
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		await repo.update(updated);
		router.push(`/workouts/${encodeURIComponent(workout.name)}`);
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
					<div className="bg-zinc-900 rounded-xl px-4 py-3.5">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Name</p>
						<p className="text-white font-semibold mt-0.5">{workout.name}</p>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Day of the Week</label>
						<select name="weekDay" defaultValue={workout.weekDay ?? ''} className={selectClass}>
							<option value="">No specific day</option>
							{WEEK_DAYS.map(({ value, label }) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
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
											<p className="text-xs text-zinc-500 capitalize">{ex.type} · {ex.bodyRegion.join(', ')}</p>
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
