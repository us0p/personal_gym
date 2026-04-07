'use client'

import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_ANGLE = 45;
const THRESHOLD = MAX_ANGLE - 0.5;

function playBeep() {
	try {
		const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const ctx = new AudioCtx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = 'sine';
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.3, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.12);
	} catch {
		// Audio not available in this environment
	}
}

interface Props {
	onClose: () => void;
}

export default function SpeedAssistant({ onClose }: Props) {
	const [duration, setDuration] = useState(1);
	const [running, setRunning] = useState(false);
	const [angle, setAngle] = useState(-MAX_ANGLE);
	const rafRef = useRef<number>(0);
	const startTimeRef = useRef<number>(0);
	const lastBeepSideRef = useRef<'left' | 'right' | null>(null);

	const stop = useCallback(() => {
		setRunning(false);
		cancelAnimationFrame(rafRef.current);
		setAngle(-MAX_ANGLE);
		lastBeepSideRef.current = null;
	}, []);

	const start = useCallback(() => {
		setRunning(true);
	}, []);

	useEffect(() => {
		if (!running) return;

		startTimeRef.current = performance.now();
		lastBeepSideRef.current = null;

		// Mark left as the starting side so the first beep fires at the right end
		lastBeepSideRef.current = 'left';

		function tick(now: number) {
			const elapsed = (now - startTimeRef.current) / 1000;
			const period = duration * 2;
			// cos starts at -1 (left end), goes to +1 (right end), back to -1
			const currentAngle = -MAX_ANGLE * Math.cos((2 * Math.PI * elapsed) / period);
			setAngle(currentAngle);

			const atLeft = currentAngle <= -THRESHOLD;
			const atRight = currentAngle >= THRESHOLD;

			if (atLeft && lastBeepSideRef.current !== 'left') {
				lastBeepSideRef.current = 'left';
				playBeep();
			} else if (atRight && lastBeepSideRef.current !== 'right') {
				lastBeepSideRef.current = 'right';
				playBeep();
			}

			rafRef.current = requestAnimationFrame(tick);
		}

		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [running, duration]);

	const ROD_LENGTH = 180;
	const BOB_R = 18;

	return (
		<div
			className="fixed inset-0 bg-black flex flex-col items-center justify-between z-50 py-10 px-6"
			data-testid="speed-assistant"
		>
			{/* Header */}
			<div className="w-full flex items-center justify-between max-w-lg">
				<button
					onClick={onClose}
					className="text-zinc-400 bg-zinc-900 rounded-xl px-4 py-2 text-sm font-medium"
					data-testid="close-button"
				>
					← Back
				</button>
				<h2 className="text-white font-bold text-lg">Speed Assistant</h2>
				<div className="w-16" />
			</div>

			{/* Pendulum */}
			<div className="flex flex-col items-center" aria-label="Pendulum animation">
				{/* Pivot point */}
				<div className="relative w-4 h-4">
					<div className="absolute inset-0 rounded-full bg-zinc-500" />
				</div>
				<div
					style={{
						transformOrigin: 'top center',
						transform: `rotate(${angle}deg)`,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
					data-testid="pendulum-arm"
				>
					{/* Rod */}
					<div
						style={{
							width: 3,
							height: ROD_LENGTH,
							background: '#a1a1aa',
							borderRadius: 2,
						}}
					/>
					{/* Bob */}
					<div
						style={{
							width: BOB_R * 2,
							height: BOB_R * 2,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #f4f4f5 0%, #71717a 100%)',
							marginTop: -2,
						}}
					/>
				</div>
			</div>

			{/* Controls */}
			<div className="w-full max-w-lg space-y-6">
				{/* Duration input */}
				<div className="bg-zinc-900 rounded-2xl p-4">
					<label className="text-zinc-400 text-sm block mb-2">
						Seconds per swing (one side to the other)
					</label>
					<input
						type="number"
						min={0.1}
						step={0.1}
						value={duration}
						onChange={(e) => {
							const val = parseFloat(e.target.value);
							if (val > 0) setDuration(val);
						}}
						disabled={running}
						data-testid="duration-input"
						className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-lg font-semibold text-center disabled:opacity-50"
					/>
				</div>

				{/* Buttons */}
				<div className="grid grid-cols-2 gap-3">
					<button
						onClick={start}
						disabled={running}
						data-testid="start-button"
						className="bg-white text-black font-semibold rounded-2xl py-4 text-base disabled:opacity-40"
					>
						Start
					</button>
					<button
						onClick={stop}
						disabled={!running}
						data-testid="stop-button"
						className="bg-zinc-800 text-white font-semibold rounded-2xl py-4 text-base disabled:opacity-40"
					>
						Stop
					</button>
				</div>
			</div>
		</div>
	);
}
