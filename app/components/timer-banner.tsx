'use client'

import { usePathname, useRouter } from 'next/navigation';
import { useTimer } from '../context/timer-context';

function formatCountdown(s: number) {
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TimerBanner() {
	const { isActive, timerRemaining, timerTotal, activeExercise, cancelTimer } = useTimer();
	const pathname = usePathname();
	const router = useRouter();

	if (!isActive || !activeExercise) return null;

	const exercisePath = `/workouts/${encodeURIComponent(activeExercise.workoutName)}/${encodeURIComponent(activeExercise.exerciseName)}`;
	if (pathname === exercisePath) return null;

	const progress = timerTotal > 0 ? timerRemaining / timerTotal : 0;

	return (
		<div
			role="button"
			onClick={() => router.push(exercisePath)}
			className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 cursor-pointer"
		>
			<div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
				<div className="min-w-0">
					<p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">Rest · {activeExercise.workoutName}</p>
					<p className="text-white text-sm font-semibold truncate">{activeExercise.exerciseName}</p>
				</div>
				<div className="flex items-center gap-4 shrink-0">
					<p className="text-xl font-bold tabular-nums">{formatCountdown(timerRemaining)}</p>
					<button
						onClick={(e) => { e.stopPropagation(); cancelTimer(); }}
						className="text-zinc-500 text-xs font-medium px-1"
					>
						Skip
					</button>
				</div>
			</div>
			{/* Progress bar */}
			<div className="h-0.5 bg-zinc-800">
				<div
					className="h-full bg-white transition-all duration-500"
					style={{ width: `${progress * 100}%` }}
				/>
			</div>
		</div>
	);
}
