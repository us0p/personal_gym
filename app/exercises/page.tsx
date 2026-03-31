'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { Exercise } from '../core/entities/exercise/exercise';

export default function ExercisesPage() {
	const [exercises, setExercises] = useState<Exercise[]>([]);

	async function load() {
		const db = await Database.getInstance();
		setExercises(await db.getAll<Exercise>('exercise'));
	}

	useEffect(() => { load(); }, []);

	async function handleDelete(name: string) {
		if (!confirm(`Delete "${name}"?`)) return;
		const db = await Database.getInstance();
		await db.delete('exercise', name);
		load();
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Exercises</h1>
					<Link href="/exercises/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
						+ New
					</Link>
				</div>

				<div className="space-y-3">
					{exercises.length === 0 && (
						<p className="text-zinc-500 text-center py-12">No exercises yet. Add your first one.</p>
					)}
					{exercises.map((ex) => (
						<div key={ex.name} className="bg-zinc-900 rounded-2xl p-4">
							<div className="flex items-start justify-between">
								<div>
									<p className="font-semibold">{ex.name}</p>
									<p className="text-zinc-400 text-sm mt-0.5 capitalize">
										{ex.type} · {ex.bodyRegion.join(', ')}
									</p>
								</div>
								<span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${ex.type === 'push' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
									{ex.type}
								</span>
							</div>
							<div className="flex gap-2 mt-3">
								<Link
									href={`/exercises/${encodeURIComponent(ex.name)}`}
									className="text-sm bg-zinc-800 text-white rounded-xl px-4 py-2 font-medium"
								>
									Edit
								</Link>
								<button
									onClick={() => handleDelete(ex.name)}
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
