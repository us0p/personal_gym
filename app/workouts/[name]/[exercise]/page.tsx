'use client'

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../../core/infra/database';
import { Exercise, ExerciseType } from '../../../core/entities/exercise/exercise';
import { Execution } from '../../../core/entities/execution/execution';
import { ExecutionRepository } from '../../../core/entities/execution/execution-repository';
import { ExecutionRestRepository } from '../../../core/entities/execution/execution-rest-repository';
import { useUser } from '../../../context/user-context';
import { useTimer } from '../../../context/timer-context';

function formatTime(ts: string) {
	return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(totalSeconds: number): string {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExerciseLogPage() {
	const params = useParams();
	const router = useRouter();
	const { user } = useUser();
	const { isActive: timerActive, timerRemaining, timerTotal, startTimer, cancelTimer, unlockAudio, setActiveExercise } = useTimer();

	const workoutName = decodeURIComponent(params.name as string);
	const exerciseName = decodeURIComponent(params.exercise as string);

	const [exerciseType, setExerciseType] = useState<ExerciseType | null>(null);
	const [executions, setExecutions] = useState<Execution[]>([]);
	const [restMinutes, setRestMinutes] = useState(1);
	const [restSeconds, setRestSeconds] = useState(30);
	const formRef = useRef<HTMLFormElement>(null);

	// Track this as the active exercise for global resume
	useEffect(() => {
		setActiveExercise({ workoutName, exerciseName });
	}, [workoutName, exerciseName, setActiveExercise]);

	async function loadExecutions() {
		const db = await Database.getInstance();
		const repo = new ExecutionRepository(db);
		setExecutions(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
	}

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const [found, repo] = [
				await db.get<Exercise>('exercise', exerciseName),
				new ExecutionRepository(db),
			];
			if (found) setExerciseType(found.type);
			setExecutions(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
		}
		load();
	}, [workoutName, exerciseName]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;
		unlockAudio();

		const form = new FormData(e.currentTarget);
		const execution: Omit<Execution, 'id'> = exerciseType === 'cardio'
			? { workoutName, exerciseName, durationMin: Number(form.get('durationMin')), timestamp: new Date().toISOString(), username: user.username }
			: { workoutName, exerciseName, repNumber: Number(form.get('repNumber')), timestamp: new Date().toISOString(), username: user.username };

		const db = await Database.getInstance();
		const execRepo = new ExecutionRepository(db);
		const executionId = await execRepo.add(execution);

		const totalRestSeconds = restMinutes * 60 + restSeconds;
		if (totalRestSeconds > 0) {
			const restRepo = new ExecutionRestRepository(db);
			await restRepo.add({
				executionId,
				workoutName,
				timestamp: new Date().toISOString(),
				durationSeconds: totalRestSeconds,
			});
			startTimer(workoutName, exerciseName, totalRestSeconds);
		}

		formRef.current?.reset();
		await loadExecutions();
	}

	async function handleDelete(id: number) {
		const db = await Database.getInstance();
		const repo = new ExecutionRepository(db);
		await repo.delete(id);
		await loadExecutions();
	}

	const totalRestSecs = restMinutes * 60 + restSeconds;

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-center gap-3">
					<button onClick={() => router.push(`/workouts/${encodeURIComponent(workoutName)}`)} className="text-zinc-400 text-2xl leading-none">‹</button>
					<div>
						<h1 className="text-2xl font-bold">{exerciseName}</h1>
						<p className="text-zinc-500 text-sm mt-0.5">{workoutName}</p>
					</div>
				</div>

				{/* Active rest timer */}
				{timerActive && (
					<div className="bg-zinc-900 rounded-2xl p-5 space-y-3 border border-zinc-700">
						<div className="flex items-center justify-between">
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Rest</p>
							<button onClick={cancelTimer} className="text-zinc-500 text-xs font-medium hover:text-zinc-300">
								Skip
							</button>
						</div>
						<p className="text-5xl font-bold tabular-nums text-center tracking-tight">
							{formatCountdown(timerRemaining)}
						</p>
						{/* Progress bar */}
						<div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-white rounded-full transition-all duration-500"
								style={{ width: `${timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 0}%` }}
							/>
						</div>
					</div>
				)}

				{/* Rest duration config + Log form */}
				<div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
					{/* Rest configuration */}
					<div>
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">Rest after set</p>
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<label className="text-xs text-zinc-500 block mb-1">Min</label>
								<input
									type="number"
									min={0}
									max={59}
									value={restMinutes}
									onChange={(e) => setRestMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
									className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600 text-base text-center tabular-nums"
								/>
							</div>
							<span className="text-zinc-500 font-bold text-lg mt-4">:</span>
							<div className="flex-1">
								<label className="text-xs text-zinc-500 block mb-1">Sec</label>
								<input
									type="number"
									min={0}
									max={59}
									value={restSeconds}
									onChange={(e) => setRestSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
									className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600 text-base text-center tabular-nums"
								/>
							</div>
						</div>
					</div>

					{/* Log form */}
					<div>
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
							{exerciseType === 'cardio' ? 'Log Session' : 'Log Set'}
						</p>
						<form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
							{exerciseType === 'cardio' ? (
								<input
									required
									name="durationMin"
									type="number"
									min={1}
									placeholder="Duration (min)"
									className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
								/>
							) : (
								<input
									required
									name="repNumber"
									type="number"
									min={1}
									placeholder="Reps"
									className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
								/>
							)}
							<button
								type="submit"
								className="bg-white text-black rounded-xl px-6 py-3.5 font-bold text-base shrink-0"
							>
								Log
							</button>
						</form>
					</div>
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
												<p className="font-semibold">
													{ex.durationMin !== undefined ? `${ex.durationMin} min` : `${ex.repNumber} reps`}
												</p>
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
