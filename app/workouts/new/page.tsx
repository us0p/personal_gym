'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Database from '../../core/infra/database';
import { Workout, WeekDay } from '../../core/entities/workout/workout';
import { WorkoutRepository } from '../../core/entities/workout/workout-repository';
import { Exercise } from '../../core/entities/exercise/exercise';
import { useUser } from '../../context/user-context';

const inputClass = "w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base";
const selectClass = `${inputClass} appearance-none`;

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
	{ value: WeekDay.MONDAY, label: 'Monday' },
	{ value: WeekDay.TUESDAY, label: 'Tuesday' },
	{ value: WeekDay.WEDNESDAY, label: 'Wednesday' },
	{ value: WeekDay.THURSDAY, label: 'Thursday' },
	{ value: WeekDay.FRIDAY, label: 'Friday' },
	{ value: WeekDay.SATURDAY, label: 'Saturday' },
	{ value: WeekDay.SUNDAY, label: 'Sunday' },
];

export default function NewWorkoutPage() {
	const router = useRouter();
	const { user } = useUser();
	const [exercises, setExercises] = useState<Exercise[]>([]);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			setExercises(await db.getAll<Exercise>('exercise'));
		}
		load();
	}, []);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) {
			alert('No profile found. Please create a profile first.');
			router.push('/users/new');
			return;
		}
		const form = new FormData(e.currentTarget);
		const weekDayRaw = form.get('weekDay') as string;
		const workout: Workout = {
			name: form.get('name') as string,
			exercises: form.getAll('exercises') as string[],
			username: user.username,
			weekDay: weekDayRaw ? (weekDayRaw as WeekDay) : undefined,
		};
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		try {
			await repo.add(workout);
			router.push('/workouts');
		} catch {
			alert('A workout with this name already exists.');
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">New Workout</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						placeholder="Workout name"
						className={inputClass}
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Day of the Week</label>
						<select name="weekDay" className={selectClass}>
							<option value="">No specific day</option>
							{WEEK_DAYS.map(({ value, label }) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">Exercises</label>
						{exercises.length === 0 ? (
							<div className="bg-zinc-900 rounded-xl p-4 text-center">
								<p className="text-zinc-500 text-sm">No exercises available.</p>
								<Link href="/exercises/new" className="text-white text-sm underline mt-1 inline-block">
									Create an exercise first
								</Link>
							</div>
						) : (
							<div className="space-y-2">
								{exercises.map((ex) => (
									<label key={ex.name} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3.5 cursor-pointer active:bg-zinc-800">
										<input type="checkbox" name="exercises" value={ex.name} className="w-4 h-4 accent-white" />
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
						Create Workout
					</button>
				</form>
			</div>
		</div>
	);
}
