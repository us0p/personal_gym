'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from '../context/locale-context';

function getStorageKey(workoutName: string, exerciseName: string) {
	return `customTimer_${workoutName}_${exerciseName}`;
}

function readSavedConfig(workoutName: string, exerciseName: string): { minutes: number; seconds: number } {
	try {
		const raw = localStorage.getItem(getStorageKey(workoutName, exerciseName));
		if (raw) {
			const parsed = JSON.parse(raw);
			if (typeof parsed?.minutes === 'number' && typeof parsed?.seconds === 'number') {
				return { minutes: parsed.minutes, seconds: parsed.seconds };
			}
		}
	} catch {}
	return { minutes: 1, seconds: 30 };
}

function saveConfig(workoutName: string, exerciseName: string, minutes: number, seconds: number) {
	try {
		localStorage.setItem(getStorageKey(workoutName, exerciseName), JSON.stringify({ minutes, seconds }));
	} catch {}
}

function formatCountdown(totalSeconds: number): string {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function postToSW(message: object) {
	if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage(message);
	}
}

export default function CountdownTimer({
	workoutName,
	exerciseName,
	onClose,
}: {
	workoutName: string;
	exerciseName: string;
	onClose: () => void;
}) {
	const { t } = useLocale();

	const [minutes, setMinutes] = useState(() => readSavedConfig(workoutName, exerciseName).minutes);
	const [seconds, setSeconds] = useState(() => readSavedConfig(workoutName, exerciseName).seconds);
	const [endTime, setEndTime] = useState<number | null>(null);
	const [remaining, setRemaining] = useState(0);
	const [total, setTotal] = useState(0);

	const audioCtxRef = useRef<AudioContext | null>(null);
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);

	const isRunning = endTime !== null;

	const playAlarm = useCallback(() => {
		try {
			const Cls =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!audioCtxRef.current) audioCtxRef.current = new Cls();
			const ctx = audioCtxRef.current;
			const run = () => {
				[0, 0.35, 0.7, 1.05, 1.4].forEach((offset) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.type = 'sine';
					osc.frequency.value = 880;
					gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
					gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
					osc.start(ctx.currentTime + offset);
					osc.stop(ctx.currentTime + offset + 0.3);
				});
			};
			if (ctx.state === 'suspended') {
				ctx.resume().then(run).catch(() => {});
			} else {
				run();
			}
		} catch {}
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			navigator.vibrate([200, 100, 200, 100, 200]);
		}
	}, []);

	const releaseWakeLock = useCallback(async () => {
		try {
			await wakeLockRef.current?.release();
		} catch {}
		wakeLockRef.current = null;
	}, []);

	// Timer tick
	useEffect(() => {
		if (endTime === null) return;

		function tick() {
			const rem = Math.max(0, Math.ceil((endTime! - Date.now()) / 1000));
			setRemaining(rem);
			if (rem <= 0) {
				setEndTime(null);
				playAlarm();
				releaseWakeLock();
				postToSW({ type: 'TIMER_CANCEL' });
			}
		}

		tick();
		const interval = setInterval(tick, 500);
		const onVisibility = () => { if (!document.hidden) tick(); };
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [endTime, playAlarm, releaseWakeLock]);

	const handleStart = useCallback(async () => {
		const totalSecs = minutes * 60 + seconds;
		if (totalSecs <= 0) return;

		// Unlock audio on user gesture
		try {
			const Cls =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!audioCtxRef.current) audioCtxRef.current = new Cls();
			if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
		} catch {}

		// Request notification permission
		if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
			await Notification.requestPermission().catch(() => {});
		}

		const newEndTime = Date.now() + totalSecs * 1000;
		setEndTime(newEndTime);
		setTotal(totalSecs);
		setRemaining(totalSecs);

		// Acquire wake lock to keep screen on
		try {
			if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
				wakeLockRef.current = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
			}
		} catch {}

		postToSW({ type: 'TIMER_START', endTime: newEndTime, exerciseName });
	}, [minutes, seconds, exerciseName]);

	const handleCancel = useCallback(() => {
		setEndTime(null);
		setRemaining(0);
		releaseWakeLock();
		postToSW({ type: 'TIMER_CANCEL' });
	}, [releaseWakeLock]);

	const handleClose = useCallback(() => {
		if (isRunning) handleCancel();
		saveConfig(workoutName, exerciseName, minutes, seconds);
		onClose();
	}, [isRunning, handleCancel, workoutName, exerciseName, minutes, seconds, onClose]);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-center gap-3">
					<button onClick={handleClose} className="text-zinc-400 text-2xl leading-none">‹</button>
					<div>
						<h1 className="text-2xl font-bold">{t('countdownTimer.title')}</h1>
						<p className="text-zinc-500 text-sm mt-0.5">{exerciseName} · {workoutName}</p>
					</div>
				</div>

				{!isRunning ? (
					/* Config view */
					<div className="bg-zinc-900 rounded-2xl p-6 space-y-6">
						<div className="flex items-center gap-4 justify-center">
							<div className="flex-1">
								<label className="text-xs text-zinc-500 block mb-2 text-center">{t('countdownTimer.min')}</label>
								<input
									type="number"
									min={0}
									max={59}
									value={minutes}
									onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
									className="w-full bg-zinc-800 text-white rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-zinc-600 text-3xl text-center tabular-nums font-bold"
								/>
							</div>
							<span className="text-zinc-500 font-bold text-3xl mt-5">:</span>
							<div className="flex-1">
								<label className="text-xs text-zinc-500 block mb-2 text-center">{t('countdownTimer.sec')}</label>
								<input
									type="number"
									min={0}
									max={59}
									value={seconds}
									onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
									className="w-full bg-zinc-800 text-white rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-zinc-600 text-3xl text-center tabular-nums font-bold"
								/>
							</div>
						</div>
						<button
							onClick={handleStart}
							disabled={minutes * 60 + seconds <= 0}
							className="w-full bg-white text-black rounded-xl px-6 py-4 font-bold text-lg disabled:opacity-40"
						>
							{t('countdownTimer.start')}
						</button>
					</div>
				) : (
					/* Running view */
					<div className="bg-zinc-900 rounded-2xl p-6 space-y-6">
						<p className="text-8xl font-bold tabular-nums text-center tracking-tight">
							{formatCountdown(remaining)}
						</p>
						<div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-white rounded-full transition-all duration-500"
								style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }}
							/>
						</div>
						<button
							onClick={handleCancel}
							className="w-full bg-zinc-800 text-white rounded-xl px-6 py-4 font-bold text-lg"
						>
							{t('countdownTimer.cancel')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
