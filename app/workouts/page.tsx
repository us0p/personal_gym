'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { Workout } from '../core/entities/workout/workout';

export default function WorkoutsPage() {
	const [workouts, setWorkouts] = useState<Workout[]>([]);

	async function load() {
		const db = await Database.getInstance();
		setWorkouts(await db.getAll<Workout>('workout'));
	}

	useEffect(() => { load(); }, []);

	async function handleDelete(name: string) {
		if (!confirm(`Delete "${name}"?`)) return;
		const db = await Database.getInstance();
		await db.delete('workout', name);
		load();
	}

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
								<div>
									<p className="font-semibold text-lg">{w.name}</p>
									<p className="text-zinc-400 text-sm mt-0.5">
										{w.exercises.length} {w.exercises.length === 1 ? 'exercise' : 'exercises'}
									</p>
								</div>
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
							<div className="flex gap-2 mt-3">
								<Link
									href={`/workouts/${encodeURIComponent(w.name)}`}
									className="text-sm bg-zinc-800 text-white rounded-xl px-4 py-2 font-medium"
								>
									Edit
								</Link>
								<button
									onClick={() => handleDelete(w.name)}
									className="text-sm bg-zinc-800 text-red-400 rounded-xl px-4 py-2 font-medium ml-auto"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
