// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import SpeedAssistant from '../speed-assistant';

// ── mocks ─────────────────────────────────────────────────────────────────────

// Web Audio API mock
const mockStop = vi.fn();
const mockStart = vi.fn();
const mockConnect = vi.fn();
const mockSetValueAtTime = vi.fn();
const mockExponentialRampToValueAtTime = vi.fn();
const mockCreateOscillator = vi.fn(() => ({
	connect: mockConnect,
	type: 'sine',
	frequency: { value: 880 },
	start: mockStart,
	stop: mockStop,
}));
const mockCreateGain = vi.fn(() => ({
	connect: mockConnect,
	gain: {
		setValueAtTime: mockSetValueAtTime,
		exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
	},
}));
const mockClose = vi.fn();

class MockAudioContext {
	currentTime = 0;
	createOscillator = mockCreateOscillator;
	createGain = mockCreateGain;
	destination = {};
	close = mockClose;
}

// RAF mock
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafIdCounter = 0;

const mockRaf = vi.fn((cb: FrameRequestCallback) => {
	const id = ++rafIdCounter;
	rafCallbacks.set(id, cb);
	return id;
});

const mockCancelRaf = vi.fn((id: number) => {
	rafCallbacks.delete(id);
});

// performance.now mock
let mockNow = 0;
const mockPerformanceNow = vi.fn(() => mockNow);

function flushRaf(timestamp = 0) {
	const cbs = Array.from(rafCallbacks.values());
	for (const cb of cbs) cb(timestamp);
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
	rafCallbacks = new Map();
	rafIdCounter = 0;
	mockNow = 0;

	vi.stubGlobal('AudioContext', MockAudioContext);
	vi.stubGlobal('requestAnimationFrame', mockRaf);
	vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
	vi.stubGlobal('performance', { now: mockPerformanceNow });

	vi.clearAllMocks();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// ── helpers ───────────────────────────────────────────────────────────────────

function renderAssistant(onClose = vi.fn()) {
	return { onClose, ...render(<SpeedAssistant onClose={onClose} />) };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SpeedAssistant – rendering', () => {
	it('renders the overlay with all controls', () => {
		renderAssistant();
		expect(screen.getByTestId('speed-assistant')).toBeDefined();
		expect(screen.getByTestId('close-button')).toBeDefined();
		expect(screen.getByTestId('start-button')).toBeDefined();
		expect(screen.getByTestId('stop-button')).toBeDefined();
		expect(screen.getByTestId('duration-input')).toBeDefined();
		expect(screen.getByTestId('pendulum-arm')).toBeDefined();
	});

	it('shows the "Speed Assistant" heading', () => {
		renderAssistant();
		expect(screen.getByText('Speed Assistant')).toBeDefined();
	});

	it('duration input defaults to 1', () => {
		renderAssistant();
		const input = screen.getByTestId('duration-input') as HTMLInputElement;
		expect(input.value).toBe('1');
	});
});

describe('SpeedAssistant – close button', () => {
	it('calls onClose when the back button is clicked', () => {
		const { onClose } = renderAssistant();
		fireEvent.click(screen.getByTestId('close-button'));
		expect(onClose).toHaveBeenCalledOnce();
	});
});

describe('SpeedAssistant – start/stop', () => {
	it('start button is enabled and stop button is disabled initially', () => {
		renderAssistant();
		expect((screen.getByTestId('start-button') as HTMLButtonElement).disabled).toBe(false);
		expect((screen.getByTestId('stop-button') as HTMLButtonElement).disabled).toBe(true);
	});

	it('start button becomes disabled and stop button enabled after clicking start', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		expect((screen.getByTestId('start-button') as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByTestId('stop-button') as HTMLButtonElement).disabled).toBe(false);
	});

	it('stop resets buttons to initial state', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		await act(async () => {
			fireEvent.click(screen.getByTestId('stop-button'));
		});
		expect((screen.getByTestId('start-button') as HTMLButtonElement).disabled).toBe(false);
		expect((screen.getByTestId('stop-button') as HTMLButtonElement).disabled).toBe(true);
	});

	it('schedules a requestAnimationFrame when started', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		expect(mockRaf).toHaveBeenCalled();
	});

	it('cancels animation frame when stopped', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		await act(async () => {
			fireEvent.click(screen.getByTestId('stop-button'));
		});
		expect(mockCancelRaf).toHaveBeenCalled();
	});
});

describe('SpeedAssistant – duration input', () => {
	it('updates duration value when changed', () => {
		renderAssistant();
		const input = screen.getByTestId('duration-input') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '2.5' } });
		expect(input.value).toBe('2.5');
	});

	it('ignores non-positive values', () => {
		renderAssistant();
		const input = screen.getByTestId('duration-input') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '0' } });
		// Should remain at the previous value (1)
		expect(input.value).toBe('1');
	});

	it('duration input is disabled while running', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		expect((screen.getByTestId('duration-input') as HTMLInputElement).disabled).toBe(true);
	});

	it('duration input is enabled after stopping', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		await act(async () => {
			fireEvent.click(screen.getByTestId('stop-button'));
		});
		expect((screen.getByTestId('duration-input') as HTMLInputElement).disabled).toBe(false);
	});
});

describe('SpeedAssistant – beep on start', () => {
	it('does NOT play a beep immediately when started', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});
		expect(mockCreateOscillator).not.toHaveBeenCalled();
		expect(mockStart).not.toHaveBeenCalled();
	});
});

describe('SpeedAssistant – pendulum angle', () => {
	it('pendulum arm starts at -45 degrees (left end)', () => {
		renderAssistant();
		const arm = screen.getByTestId('pendulum-arm');
		expect(arm.style.transform).toContain('rotate(-45deg)');
	});

	it('pendulum angle changes after an animation frame tick', async () => {
		renderAssistant();
		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});

		// Simulate time progressing to the midpoint of the first swing
		// With duration=1s, period=2s, at t=0.5s angle should be near 0
		mockNow = 500; // 500ms after start
		await act(async () => {
			flushRaf(500);
		});

		const arm = screen.getByTestId('pendulum-arm');
		// At t=0.5s (quarter of 2s period), cos(π/2) ≈ 0, so angle ≈ 0
		// The transform should NOT be -45deg anymore
		expect(arm.style.transform).not.toBe('rotate(-45deg)');
	});

	it('pendulum plays a beep when reaching the right end', async () => {
		renderAssistant();
		vi.clearAllMocks();

		await act(async () => {
			fireEvent.click(screen.getByTestId('start-button'));
		});

		// Clear calls from the initial start beep
		vi.clearAllMocks();

		// Simulate time = 1s exactly: right end (cos(π) = -1, angle = +45)
		mockNow = 1000;
		await act(async () => {
			flushRaf(1000);
		});

		expect(mockCreateOscillator).toHaveBeenCalled();
		expect(mockStart).toHaveBeenCalled();
	});
});
