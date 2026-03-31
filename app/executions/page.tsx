'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { Execution } from '../core/entities/execution/execution';

export default function ExecutionsPage() {
	const [executions, setExecutions] = useState<Execution[]>([]);

	async function load() {
		const db = await Database.getInstance();
		const all = await db.getAll<Execution>('execution');
		setExecutions(all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
	}

	useEffect(() => { load(); }, []);

	async function handleDelete(id: number) {
		if (!confirm('Remove this log entry?')) return;
		const db = await Database.getInstance();
		await db.delete('execution', id);
		load();
	}

	function formatDate(ts: string) {
		return new Date(ts).toLocaleString(undefined, {
			month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
		});
	}

	// Group by date
	const grouped = executions.reduce<Record<string, Execution[]>>((acc, ex) => {
		const key = new Date(ex.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
		if (!acc[key]) acc[key] = [];
		acc[key].push(ex);
		return acc;
	}, {});

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Log</h1>
					<Link href="/executions/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
						+ Log Set
					</Link>
				</div>

				{executions.length === 0 && (
					<p className="text-zinc-500 text-center py-12">No sets logged yet. Start training!</p>
				)}

				{Object.entries(grouped).map(([date, entries]) => (
					<div key={date} className="space-y-2">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">{date}</p>
						{entries.map((ex) => (
							<div key={ex.id} className="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="font-semibold truncate">{ex.exerciseName}</p>
									<p className="text-zinc-400 text-sm mt-0.5">{ex.repNumber} reps · {ex.workoutName}</p>
									<p className="text-zinc-600 text-xs mt-0.5">{formatDate(ex.timestamp)}</p>
								</div>
								<button
									onClick={() => handleDelete(ex.id!)}
									className="shrink-0 text-red-400 bg-zinc-800 rounded-xl px-3 py-2 text-sm font-medium"
								>
									Delete
								</button>
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
