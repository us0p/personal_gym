'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { Exercise, ExerciseType, BODY_REGIONS } from '../../core/entities/exercise/exercise';

export default function EditExercisePage() {
	const params = useParams();
	const router = useRouter();
	const name = decodeURIComponent(params.name as string);
	const [exercise, setExercise] = useState<Exercise | null>(null);
	const [type, setType] = useState<ExerciseType>('push');

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const found = await db.get<Exercise>('exercise', name);
			if (found) {
				setExercise(found);
				setType(found.type);
			}
		}
		load();
	}, [name]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!exercise) return;
		const form = new FormData(e.currentTarget);
		const bodyRegion = type === 'cardio' ? [] : form.getAll('bodyRegion') as string[];
		const updated: Exercise = {
			name: exercise.name,
			type,
			bodyRegion,
		};
		const db = await Database.getInstance();
		await db.put('exercise', updated);
		router.push('/exercises');
	}

	async function handleDelete() {
		if (!confirm(`Delete "${name}"?`)) return;
		const db = await Database.getInstance();
		await db.delete('exercise', name);
		router.push('/exercises');
	}

	if (!exercise) return (
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
						<h1 className="text-2xl font-bold">Edit Exercise</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">Delete</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="bg-zinc-900 rounded-xl px-4 py-3.5">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Name</p>
						<p className="text-white font-semibold mt-0.5">{exercise.name}</p>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Type</label>
						<div className="flex gap-3">
							{(['push', 'pull', 'cardio'] as const).map((t) => (
								<label key={t} className="flex-1 cursor-pointer">
									<input
										type="radio"
										name="type"
										value={t}
										checked={type === t}
										onChange={() => setType(t)}
										className="sr-only peer"
									/>
									<div className="text-center py-3.5 rounded-xl bg-zinc-900 text-zinc-400 font-semibold capitalize peer-checked:bg-white peer-checked:text-black transition-colors">
										{t}
									</div>
								</label>
							))}
						</div>
					</div>

					{type !== 'cardio' && (
						<div>
							<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">Body Region</label>
							<div className="grid grid-cols-2 gap-2">
								{BODY_REGIONS.map((region) => (
									<label key={region} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 cursor-pointer active:bg-zinc-800">
										<input
											type="checkbox"
											name="bodyRegion"
											value={region}
											defaultChecked={exercise.bodyRegion.includes(region)}
											className="w-4 h-4 accent-white"
										/>
										<span className="text-sm font-medium">{region}</span>
									</label>
								))}
							</div>
						</div>
					)}

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base">
						Save Changes
					</button>
				</form>
			</div>
		</div>
	);
}
