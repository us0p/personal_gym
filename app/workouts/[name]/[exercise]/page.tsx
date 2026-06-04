'use client'

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SpeedAssistant from '../../../components/speed-assistant';
import Database from '../../../core/infra/database';
import { Exercise } from '../../../core/entities/exercise/exercise';
import type { ExerciseMetric } from '../../../core/entities/exercise/exercise';
import { METRICS_BY_TYPE } from '../../../core/entities/exercise/exercise';
import { Execution } from '../../../core/entities/execution/execution';
import { ExecutionRepository } from '../../../core/entities/execution/execution-repository';
import { WorkoutRepository } from '../../../core/entities/workout/workout-repository';
import { ExecutionLogService } from '../../../core/services/execution-log-service';
import { useUser } from '../../../context/user-context';
import { useTimer } from '../../../context/timer-context';
import { useLocale } from '../../../context/locale-context';
import { useToast } from '../../../context/toast-context';

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
	const { t } = useLocale();
	const { toast } = useToast();

	const workoutName = decodeURIComponent(params.name as string);
	const exerciseName = decodeURIComponent(params.exercise as string);

	const [metrics, setMetrics] = useState<ExerciseMetric[]>([]);
	const [executions, setExecutions] = useState<Execution[]>([]);
	const [restMinutes, setRestMinutes] = useState(1);
	const [restSeconds, setRestSeconds] = useState(30);
	const [showAssistant, setShowAssistant] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);

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
			const [exercise, workout, repo] = await Promise.all([
				db.get<Exercise>('exercise', exerciseName),
				new WorkoutRepository(db).get(workoutName),
				Promise.resolve(new ExecutionRepository(db)),
			]);

			const workoutEx = workout?.exercises.find((we) => we.name === exerciseName);
			if (workoutEx && workoutEx.metrics.length > 0) {
				setMetrics(workoutEx.metrics);
			} else if (exercise) {
				setMetrics([METRICS_BY_TYPE[exercise.type][0]]);
			}

			setExecutions(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
		}
		load();
	}, [workoutName, exerciseName]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;
		unlockAudio();

		const form = new FormData(e.currentTarget);
		const db = await Database.getInstance();
		const { strikeIncreased, strikeCount } = await new ExecutionLogService(db).log(
			user.username,
			workoutName,
			exerciseName,
			metrics,
			{
				repNumber: metrics.includes('reps') ? Number(form.get('repNumber')) : undefined,
				weightKg: metrics.includes('weight') ? Number(form.get('weightKg')) : undefined,
				durationMin: metrics.includes('duration') ? Number(form.get('durationMin')) : undefined,
				durationSec: metrics.includes('time') ? Number(form.get('durationSec')) : undefined,
				distanceKm: metrics.includes('distance') ? Number(form.get('distanceKm')) : undefined,
			},
		);

		if (strikeIncreased) {
			toast(t('home.strikeNotification', { count: strikeCount, username: user.username }));
		}

		const totalRestSeconds = restMinutes * 60 + restSeconds;
		if (totalRestSeconds > 0) {
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

	function formatExecution(ex: Execution): string {
		return [
			ex.repNumber !== undefined ? `${ex.repNumber} ${t('exerciseLog.reps')}` : null,
			ex.weightKg !== undefined ? `${ex.weightKg} ${t('exerciseLog.kg')}` : null,
			ex.durationMin !== undefined ? `${ex.durationMin} ${t('exerciseLog.minAbbr')}` : null,
			ex.durationSec !== undefined ? `${ex.durationSec} ${t('exerciseLog.secAbbr')}` : null,
			ex.distanceKm !== undefined ? `${ex.distanceKm} ${t('exerciseLog.km')}` : null,
		].filter(Boolean).join(' · ');
	}

	if (showAssistant) {
		return <SpeedAssistant onClose={() => setShowAssistant(false)} />;
	}

	const inputClass = 'flex-1 min-w-[100px] bg-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base';

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
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('exerciseLog.rest')}</p>
							<button onClick={cancelTimer} className="text-zinc-500 text-xs font-medium hover:text-zinc-300">
								{t('exerciseLog.skip')}
							</button>
						</div>
						<p className="text-5xl font-bold tabular-nums text-center tracking-tight">
							{formatCountdown(timerRemaining)}
						</p>
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
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">{t('exerciseLog.restAfterSet')}</p>
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<label className="text-xs text-zinc-500 block mb-1">{t('exerciseLog.min')}</label>
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
								<label className="text-xs text-zinc-500 block mb-1">{t('exerciseLog.sec')}</label>
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
							{t('exerciseLog.logSet')}
						</p>
						<form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
							<div className="flex flex-wrap gap-3">
								{metrics.includes('reps') && (
									<input
										required
										name="repNumber"
										type="number"
										min={1}
										placeholder={t('exerciseLog.repsPlaceholder')}
										className={inputClass}
									/>
								)}
								{metrics.includes('weight') && (
									<input
										required
										name="weightKg"
										type="number"
										min={0}
										step={0.5}
										placeholder={t('exerciseLog.weightPlaceholder')}
										className={inputClass}
									/>
								)}
								{metrics.includes('duration') && (
									<input
										required
										name="durationMin"
										type="number"
										min={1}
										placeholder={t('exerciseLog.durationPlaceholder')}
										className={inputClass}
									/>
								)}
								{metrics.includes('time') && (
									<input
										required
										name="durationSec"
										type="number"
										min={1}
										placeholder={t('exerciseLog.timePlaceholder')}
										className={inputClass}
									/>
								)}
								{metrics.includes('distance') && (
									<input
										required
										name="distanceKm"
										type="number"
										min={0.01}
										step={0.01}
										placeholder={t('exerciseLog.distancePlaceholder')}
										className={inputClass}
									/>
								)}
							</div>
							<button
								type="submit"
								className="w-full bg-white text-black rounded-xl px-6 py-3.5 font-bold text-base"
							>
								{t('exerciseLog.log')}
							</button>
						</form>
					</div>
				</div>

				{/* Speed assistant */}
				<button
					onClick={() => setShowAssistant(true)}
					data-testid="open-speed-assistant"
					className="w-full bg-white text-black font-semibold rounded-2xl py-4 text-base"
				>
					{t('exerciseLog.speedAssistant')}
				</button>

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
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">{t('exerciseLog.loggedSets')}</p>
							{Object.entries(grouped).map(([date, entries]) => (
								<div key={date} className="space-y-2">
									<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">{date}</p>
									{entries.map((ex) => (
										<div key={ex.id} className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
											<div className="min-w-0">
												<p className="font-semibold">{formatExecution(ex)}</p>
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
