export interface ActiveExercise {
	workoutName: string;
	exerciseName: string;
}

export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

const SESSION_KEY = 'activeExercise';

function defaultStorage(): StorageAdapter {
	return {
		getItem: (key) => (typeof window !== 'undefined' ? sessionStorage.getItem(key) : null),
		setItem: (key, value) => { if (typeof window !== 'undefined') sessionStorage.setItem(key, value); },
		removeItem: (key) => { if (typeof window !== 'undefined') sessionStorage.removeItem(key); },
	};
}

export class TimerService {
	private endTime: number | null = null;
	private total: number = 0;
	private activeExercise: ActiveExercise | null = null;
	private readonly storage: StorageAdapter;

	constructor(storage?: StorageAdapter) {
		this.storage = storage ?? defaultStorage();
	}

	start(workoutName: string, exerciseName: string, totalSeconds: number): void {
		this.endTime = Date.now() + totalSeconds * 1000;
		this.total = totalSeconds;
		const exercise = { workoutName, exerciseName };
		this.activeExercise = exercise;
		this.saveActiveExercise(exercise);
	}

	cancel(): void {
		this.endTime = null;
	}

	getRemainingSeconds(now: number = Date.now()): number {
		if (this.endTime === null) return 0;
		return Math.max(0, Math.ceil((this.endTime - now) / 1000));
	}

	isActive(now: number = Date.now()): boolean {
		return this.endTime !== null && this.getRemainingSeconds(now) > 0;
	}

	getEndTime(): number | null {
		return this.endTime;
	}

	getTotal(): number {
		return this.total;
	}

	saveActiveExercise(exercise: ActiveExercise | null): void {
		this.activeExercise = exercise;
		if (exercise) {
			this.storage.setItem(SESSION_KEY, JSON.stringify(exercise));
		} else {
			this.storage.removeItem(SESSION_KEY);
		}
	}

	readActiveExercise(): ActiveExercise | null {
		try {
			const raw = this.storage.getItem(SESSION_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (typeof parsed?.workoutName === 'string' && typeof parsed?.exerciseName === 'string') {
				return { workoutName: parsed.workoutName, exerciseName: parsed.exerciseName };
			}
			return null;
		} catch {
			return null;
		}
	}

	getActiveExercise(): ActiveExercise | null {
		return this.activeExercise;
	}
}
