'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { Workout, WeekDay } from '../core/entities/workout/workout';
import { WorkoutRepository } from '../core/entities/workout/workout-repository';

const DAY_LABEL: Record<WeekDay, string> = {
	[WeekDay.MONDAY]: 'Mon',
	[WeekDay.TUESDAY]: 'Tue',
	[WeekDay.WEDNESDAY]: 'Wed',
	[WeekDay.THURSDAY]: 'Thu',
	[WeekDay.FRIDAY]: 'Fri',
	[WeekDay.SATURDAY]: 'Sat',
	[WeekDay.SUNDAY]: 'Sun',
};

export default function WorkoutsPage() {
	const [workouts, setWorkouts] = useState<Workout[]>([]);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const repo = new WorkoutRepository(db);
			setWorkouts(await repo.getAll());
		}
		load();
	}, []);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Workouts</h1>
					<Link href="/workouts/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
						+ New
					</Link>
				</div>

				<div className="space-y-3">
					{workouts.length === 0 && (
						<p className="text-zinc-500 text-center py-12">No workouts yet. Create your first routine.</p>
					)}
					{workouts.map((w) => (
						<div key={w.name} className="bg-zinc-900 rounded-2xl p-4">
							<div className="flex items-start justify-between">
								<Link
									href={`/workouts/${encodeURIComponent(w.name)}`}
									className="flex-1 min-w-0"
								>
									<div className="flex items-center gap-2">
										<p className="font-semibold text-lg truncate">{w.name}</p>
										{w.weekDay && (
											<span className="shrink-0 text-xs bg-zinc-700 text-zinc-300 rounded-full px-2.5 py-0.5 font-semibold">
												{DAY_LABEL[w.weekDay]}
											</span>
										)}
									</div>
									<p className="text-zinc-400 text-sm mt-0.5">
										{w.exercises.length} {w.exercises.length === 1 ? 'exercise' : 'exercises'}
									</p>
								</Link>
								<Link
									href={`/workouts/${encodeURIComponent(w.name)}/edit`}
									className="shrink-0 text-sm text-zinc-500 font-medium ml-4 mt-0.5"
								>
									Edit
								</Link>
							</div>
							{w.exercises.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-3">
									{w.exercises.map((ex) => (
										<span key={ex} className="text-xs bg-zinc-800 text-zinc-300 rounded-lg px-3 py-1.5 font-medium">
											{ex}
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
