'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Database from '../../core/infra/database';
import { Workout } from '../../core/entities/workout/workout';
import { Exercise } from '../../core/entities/exercise/exercise';

export default function NewWorkoutPage() {
	const router = useRouter();
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
		const form = new FormData(e.currentTarget);
		const workout: Workout = {
			name: form.get('name') as string,
			exercises: form.getAll('exercises') as string[],
		};
		const db = await Database.getInstance();
		try {
			await db.add('workout', workout);
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
						className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
					/>

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
