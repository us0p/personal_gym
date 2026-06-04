import { describe, it, expect, beforeEach } from 'vitest';
import { TimerService, type StorageAdapter, type ActiveExercise } from '../timer-service';

class MemoryStorage implements StorageAdapter {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = value;
	}

	removeItem(key: string): void {
		delete this.store[key];
	}
}

let storage: MemoryStorage;
let service: TimerService;

const now = 1_000_000_000_000;

beforeEach(() => {
	storage = new MemoryStorage();
	service = new TimerService(storage);
});

describe('start / cancel', () => {
	it('is inactive before start', () => {
		expect(service.isActive(now)).toBe(false);
		expect(service.getEndTime()).toBeNull();
		expect(service.getTotal()).toBe(0);
	});

	it('becomes active after start', () => {
		service.start('Push Day', 'Bench Press', 90);
		const after = Date.now();
		expect(service.getTotal()).toBe(90);
		expect(service.getEndTime()).toBeGreaterThanOrEqual(after + 89_000);
	});

	it('is active while time remains', () => {
		service.start('Push Day', 'Bench Press', 60);
		const endTime = service.getEndTime()!;
		expect(service.isActive(endTime - 1)).toBe(true);
	});

	it('is inactive after cancel', () => {
		service.start('Push Day', 'Bench Press', 60);
		service.cancel();
		expect(service.isActive(now)).toBe(false);
		expect(service.getEndTime()).toBeNull();
	});

	it('preserves total after cancel', () => {
		service.start('Push Day', 'Bench Press', 60);
		service.cancel();
		expect(service.getTotal()).toBe(60);
	});
});

describe('getRemainingSeconds', () => {
	it('returns 0 when not active', () => {
		expect(service.getRemainingSeconds(now)).toBe(0);
	});

	it('returns full duration immediately after start', () => {
		service.start('Push Day', 'Bench Press', 90);
		const endTime = service.getEndTime()!;
		expect(service.getRemainingSeconds(endTime - 90_000)).toBe(90);
	});

	it('returns partial remaining mid-countdown', () => {
		service.start('Push Day', 'Bench Press', 90);
		const endTime = service.getEndTime()!;
		expect(service.getRemainingSeconds(endTime - 30_000)).toBe(30);
	});

	it('returns 0 exactly at endTime', () => {
		service.start('Push Day', 'Bench Press', 90);
		const endTime = service.getEndTime()!;
		expect(service.getRemainingSeconds(endTime)).toBe(0);
	});

	it('returns 0 past endTime (does not go negative)', () => {
		service.start('Push Day', 'Bench Press', 90);
		const endTime = service.getEndTime()!;
		expect(service.getRemainingSeconds(endTime + 5_000)).toBe(0);
	});

	it('rounds up fractional seconds', () => {
		service.start('Push Day', 'Bench Press', 90);
		const endTime = service.getEndTime()!;
		// 500ms before the last second boundary: should still show 1
		expect(service.getRemainingSeconds(endTime - 500)).toBe(1);
	});
});

describe('saveActiveExercise / readActiveExercise', () => {
	const exercise: ActiveExercise = { workoutName: 'Push Day', exerciseName: 'Bench Press' };

	it('persists and retrieves active exercise', () => {
		service.saveActiveExercise(exercise);
		expect(service.readActiveExercise()).toEqual(exercise);
	});

	it('returns null when nothing saved', () => {
		expect(service.readActiveExercise()).toBeNull();
	});

	it('clears storage when passed null', () => {
		service.saveActiveExercise(exercise);
		service.saveActiveExercise(null);
		expect(service.readActiveExercise()).toBeNull();
	});

	it('updates getActiveExercise after save', () => {
		service.saveActiveExercise(exercise);
		expect(service.getActiveExercise()).toEqual(exercise);
	});

	it('saves active exercise on start', () => {
		service.start('Push Day', 'Bench Press', 60);
		expect(service.readActiveExercise()).toEqual({ workoutName: 'Push Day', exerciseName: 'Bench Press' });
	});

	it('returns null for malformed JSON', () => {
		storage.setItem('activeExercise', 'not-json{{');
		expect(service.readActiveExercise()).toBeNull();
	});

	it('returns null when JSON is missing required keys', () => {
		storage.setItem('activeExercise', JSON.stringify({ foo: 'bar' }));
		expect(service.readActiveExercise()).toBeNull();
	});
});
