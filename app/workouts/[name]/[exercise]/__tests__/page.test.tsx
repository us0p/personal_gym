// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ExerciseLogPage from '../page';

// ── navigation / user mocks ──────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
	useParams: () => ({ name: 'Workout', exercise: 'Push-Up' }),
	useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('../../../../context/user-context', () => ({
	useUser: () => ({ user: { username: 'alice' } }),
}));

vi.mock('../../../../core/infra/database', () => ({
	default: {
		getInstance: vi.fn().mockResolvedValue({
			get: vi.fn().mockResolvedValue({ type: 'push' }),
			getAll: vi.fn().mockResolvedValue([]),
		}),
	},
}));

vi.mock('../../../../core/entities/execution/execution-repository', () => ({
	ExecutionRepository: vi.fn().mockImplementation(() => ({
		add: vi.fn().mockResolvedValue(1),
		getByWorkoutAndExercise: vi.fn().mockResolvedValue([]),
		delete: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock('../../../../core/entities/execution/execution-rest-repository', () => ({
	ExecutionRestRepository: vi.fn().mockImplementation(() => ({
		add: vi.fn().mockResolvedValue(undefined),
	})),
}));

// ── AudioContext mock factory ─────────────────────────────────────────────────

function makeMockAudioCtx(initialState: AudioContextState = 'suspended') {
	const resume = vi.fn().mockResolvedValue(undefined);
	const createOscillator = vi.fn().mockReturnValue({
		connect: vi.fn(),
		type: '' as OscillatorType,
		frequency: { value: 0 },
		start: vi.fn(),
		stop: vi.fn(),
	});
	const createGain = vi.fn().mockReturnValue({
		connect: vi.fn(),
		gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
	});
	let state = initialState;
	const instance = {
		get state() { return state; },
		setState(s: AudioContextState) { state = s; },
		resume, createOscillator, createGain,
		destination: {}, currentTime: 0,
	};
	const Ctor = vi.fn().mockReturnValue(instance);
	return { Ctor, instance, resume, createOscillator };
}

// ── test helpers ──────────────────────────────────────────────────────────────

async function renderAndFlush() {
	render(<ExerciseLogPage />);
	await act(async () => {});
}

async function submitReps() {
	const input = screen.getByPlaceholderText('Reps');
	fireEvent.change(input, { target: { value: '10' } });
	await act(async () => {
		fireEvent.submit(input.closest('form')!);
	});
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ExerciseLogPage – AudioContext', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	describe('getOrCreateAudioContext', () => {
		it('creates an AudioContext on the first form submission', async () => {
			const { Ctor } = makeMockAudioCtx('running');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			expect(Ctor).toHaveBeenCalledTimes(1);
		});

		it('reuses the same AudioContext on subsequent submissions', async () => {
			const { Ctor } = makeMockAudioCtx('running');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();
			await submitReps();

			expect(Ctor).toHaveBeenCalledTimes(1);
		});

		it('falls back to webkitAudioContext when window.AudioContext is unavailable', async () => {
			const { Ctor } = makeMockAudioCtx('running');
			vi.stubGlobal('webkitAudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			expect(Ctor).toHaveBeenCalledTimes(1);
		});

		it('does not throw when neither AudioContext nor webkitAudioContext is available', async () => {
			await renderAndFlush();
			await submitReps(); // must not throw
		});
	});

	describe('unlockAudio', () => {
		it('calls resume() when context state is suspended', async () => {
			const { Ctor, resume } = makeMockAudioCtx('suspended');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			expect(resume).toHaveBeenCalledTimes(1);
		});

		it('does not call resume() when context state is running', async () => {
			const { Ctor, resume } = makeMockAudioCtx('running');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			expect(resume).not.toHaveBeenCalled();
		});

		it('does not call resume() when context state is closed', async () => {
			const { Ctor, resume } = makeMockAudioCtx('closed');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			expect(resume).not.toHaveBeenCalled();
		});
	});

	describe('playRestDone', () => {
		// Avoid vi.useFakeTimers() — it disrupts React's act() scheduling.
		// Instead, spy on setInterval to capture the tick callback, and spy on
		// Date.now to control the elapsed time.
		const BASE_TIME = 1_000_000;
		let dateSpy: ReturnType<typeof vi.spyOn>;
		let intervalSpy: ReturnType<typeof vi.spyOn>;
		let clearIntervalSpy: ReturnType<typeof vi.spyOn>;
		let capturedTick: (() => void) | null = null;

		beforeEach(() => {
			capturedTick = null;
			dateSpy = vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
			intervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(
				(fn: TimerHandler) => {
					capturedTick = fn as () => void;
					return 999 as unknown as ReturnType<typeof setInterval>;
				},
			);
			clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
		});

		afterEach(() => {
			dateSpy.mockRestore();
			intervalSpy.mockRestore();
			clearIntervalSpy.mockRestore();
		});

		async function expireTimer() {
			dateSpy.mockReturnValue(BASE_TIME + 91_000); // past the 90 s default rest
			await act(async () => {
				capturedTick!();
				await Promise.resolve(); // flush .then(doPlay) chain
			});
		}

		it('creates three oscillator nodes when timer expires with a running context', async () => {
			const { Ctor, createOscillator } = makeMockAudioCtx('running');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps(); // default rest = 1 min 30 sec → timer active, setInterval captured

			expect(capturedTick).not.toBeNull();
			await expireTimer();

			expect(createOscillator).toHaveBeenCalledTimes(3);
		});

		it('calls resume() before playing when context is still suspended at timer expiry', async () => {
			const { Ctor, resume, createOscillator } = makeMockAudioCtx('suspended');
			vi.stubGlobal('AudioContext', Ctor);

			await renderAndFlush();
			await submitReps();

			// unlockAudio() called resume() once during the user gesture
			expect(resume).toHaveBeenCalledTimes(1);

			await expireTimer();

			// playRestDone calls resume() again because context is still suspended
			expect(resume).toHaveBeenCalledTimes(2);
			// oscillators created via .then(doPlay) after the second resume resolves
			expect(createOscillator).toHaveBeenCalledTimes(3);
		});

		it('plays nothing when no AudioContext was ever created', async () => {
			// AudioContext unavailable → getOrCreateAudioContext returns null
			// audioCtxRef.current stays null → playRestDone exits immediately
			await renderAndFlush();
			await submitReps();

			// timer fires but no crash and no audio
			await expireTimer();
		});
	});
});
