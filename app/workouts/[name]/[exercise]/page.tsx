'use client'

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../../core/infra/database';
import { Execution } from '../../../core/entities/execution/execution';
import { ExecutionRepository } from '../../../core/entities/execution/execution-repository';
import { useUser } from '../../../context/user-context';

function formatTime(ts: string) {
	return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ExerciseLogPage() {
	const params = useParams();
	const router = useRouter();
	const { user } = useUser();
	const workoutName = decodeURIComponent(params.name as string);
	const exerciseName = decodeURIComponent(params.exercise as string);

	const [executions, setExecutions] = useState<Execution[]>([]);
	const formRef = useRef<HTMLFormElement>(null);

	async function loadExecutions() {
		const db = await Database.getInstance();
		const repo = new ExecutionRepository(db);
		setExecutions(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
	}

	useEffect(() => {
		loadExecutions();
	}, [workoutName, exerciseName]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;

		const form = new FormData(e.currentTarget);
		const execution: Omit<Execution, 'id'> = {
			workoutName,
			exerciseName,
			repNumber: Number(form.get('repNumber')),
			timestamp: new Date().toISOString(),
			username: user.username,
		};

		const db = await Database.getInstance();
		const repo = new ExecutionRepository(db);
		await repo.add(execution);

		formRef.current?.reset();
		await loadExecutions();
	}

	async function handleDelete(id: number) {
		const db = await Database.getInstance();
		const repo = new ExecutionRepository(db);
		await repo.delete(id);
		await loadExecutions();
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<div>
						<h1 className="text-2xl font-bold">{exerciseName}</h1>
						<p className="text-zinc-500 text-sm mt-0.5">{workoutName}</p>
					</div>
				</div>

				{/* Log Set form */}
				<div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
					<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Log Set</p>
					<form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
						<input
							required
							name="repNumber"
							type="number"
							min={1}
							placeholder="Reps"
							className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
						/>
						<button
							type="submit"
							className="bg-white text-black rounded-xl px-6 py-3.5 font-bold text-base shrink-0"
						>
							Log
						</button>
					</form>
				</div>

				{/* Logged sets grouped by date */}
				{executions.length > 0 && (() => {
					const grouped = executions.reduce<Record<string, Execution[]>>((acc, ex) => {
						const key = new Date(ex.timestamp).toLocaleDateString(undefined, {
							weekday: 'long', month: 'long', day: 'numeric',
						});
						if (!acc[key]) acc[key] = [];
						acc[key].push(ex);
						return acc;
					}, {});
					return (
						<div className="space-y-4">
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">Logged Sets</p>
							{Object.entries(grouped).map(([date, entries]) => (
								<div key={date} className="space-y-2">
									<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">{date}</p>
									{entries.map((ex) => (
										<div key={ex.id} className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
											<div className="min-w-0">
												<p className="font-semibold">{ex.repNumber} reps</p>
												<p className="text-zinc-500 text-sm">{formatTime(ex.timestamp)}</p>
											</div>
											<button
												onClick={() => handleDelete(ex.id!)}
												className="shrink-0 text-red-400 text-sm font-medium"
											>
												✕
											</button>
										</div>
									))}
								</div>
							))}
						</div>
					);
				})()}
			</div>
		</div>
	);
}
