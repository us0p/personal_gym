'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { TimerService } from '../core/services/timer-service';
import type { ActiveExercise } from '../core/services/timer-service';

interface TimerContextType {
	isActive: boolean;
	timerRemaining: number;
	timerTotal: number;
	activeExercise: ActiveExercise | null;
	startTimer: (workoutName: string, exerciseName: string, totalSeconds: number) => void;
	cancelTimer: () => void;
	setActiveExercise: (exercise: ActiveExercise | null) => void;
	unlockAudio: () => void;
}

const TimerContext = createContext<TimerContextType>({
	isActive: false,
	timerRemaining: 0,
	timerTotal: 0,
	activeExercise: null,
	startTimer: () => {},
	cancelTimer: () => {},
	setActiveExercise: () => {},
	unlockAudio: () => {},
});

export function TimerProvider({ children }: { children: ReactNode }) {
	const [timerService] = useState<TimerService>(() => new TimerService());
	const [endTime, setEndTime] = useState<number | null>(null);
	const [timerTotal, setTimerTotal] = useState(0);
	const [timerRemaining, setTimerRemaining] = useState(0);
	const [activeExercise, setActiveExerciseState] = useState<ActiveExercise | null>(
		() => new TimerService().readActiveExercise(),
	);
	const audioCtxRef = useRef<AudioContext | null>(null);

	const isActive = endTime !== null;

	// Global timer tick
	useEffect(() => {
		if (endTime === null) return;

		function playDone() {
			const ctx = audioCtxRef.current;
			if (!ctx) return;
			const run = () => {
				[0, 0.35, 0.7].forEach((offset) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.type = 'sine';
					osc.frequency.value = 880;
					gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
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
		}

		function tick() {
			const remaining = timerService.getRemainingSeconds(Date.now());
			setTimerRemaining(remaining);
			if (remaining <= 0) {
				setEndTime(null);
				playDone();
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
	}, [endTime, timerService]);

	const unlockAudio = useCallback(() => {
		try {
			if (!audioCtxRef.current) {
				const Cls = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
				if (Cls) audioCtxRef.current = new Cls();
			}
			if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
		} catch {}
	}, []);

	const startTimer = useCallback((workoutName: string, exerciseName: string, totalSeconds: number) => {
		const ex = { workoutName, exerciseName };
		const newEndTime = Date.now() + totalSeconds * 1000;
		timerService.start(workoutName, exerciseName, totalSeconds);
		setEndTime(newEndTime);
		setTimerTotal(totalSeconds);
		setTimerRemaining(totalSeconds);
		setActiveExerciseState(ex);
	}, [timerService]);

	const cancelTimer = useCallback(() => {
		timerService.cancel();
		setEndTime(null);
		setTimerRemaining(0);
	}, [timerService]);

	const setActiveExercise = useCallback((exercise: ActiveExercise | null) => {
		setActiveExerciseState(exercise);
		timerService.saveActiveExercise(exercise);
	}, [timerService]);

	return (
		<TimerContext.Provider value={{ isActive, timerRemaining, timerTotal, activeExercise, startTimer, cancelTimer, setActiveExercise, unlockAudio }}>
			{children}
		</TimerContext.Provider>
	);
}

export function useTimer() {
	return useContext(TimerContext);
}
