'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Database from '../../core/infra/database';
import { Workout } from '../../core/entities/workout/workout';
import { WorkoutRepository } from '../../core/entities/workout/workout-repository';
import { DAY_LABEL_LONG } from '../../core/entities/workout/week-day-labels';

export default function WorkoutPage() {
	const params = useParams();
	const router = useRouter();
	const workoutName = decodeURIComponent(params.name as string);
	const [workout, setWorkout] = useState<Workout | null>(null);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const repo = new WorkoutRepository(db);
			const found = await repo.get(workoutName);
			setWorkout(found ?? null);
		}
		load();
	}, [workoutName]);

	if (!workout) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">Loading…</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<div>
							<h1 className="text-2xl font-bold">{workout.name}</h1>
							{workout.weekDays && workout.weekDays.length > 0 && (
								<p className="text-zinc-500 text-sm mt-0.5">
									{workout.weekDays.map((d) => DAY_LABEL_LONG[d]).join(', ')}
								</p>
							)}
						</div>
					</div>
					<Link
						href={`/workouts/${encodeURIComponent(workout.name)}/edit`}
						className="text-sm text-zinc-400 font-medium mt-1"
					>
						Edit
					</Link>
				</div>

				{/* Exercise list */}
				{workout.exercises.length === 0 ? (
					<div className="bg-zinc-900 rounded-2xl p-6 text-center space-y-2">
						<p className="text-zinc-400 text-sm">No exercises in this workout yet.</p>
						<Link
							href={`/workouts/${encodeURIComponent(workout.name)}/edit`}
							className="text-white text-sm underline"
						>
							Add exercises
						</Link>
					</div>
				) : (
					<div className="space-y-2">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">Exercises</p>
						{workout.exercises.map((exercise) => (
							<Link
								key={exercise}
								href={`/workouts/${encodeURIComponent(workout.name)}/${encodeURIComponent(exercise)}`}
								className="flex items-center justify-between bg-zinc-900 rounded-2xl px-4 py-4"
							>
								<p className="font-semibold">{exercise}</p>
								<span className="text-zinc-500 text-xl leading-none">›</span>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
