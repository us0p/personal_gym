interface Execution {
	id?: number;
	workoutName: string;
	exerciseName: string;
	repNumber?: number;
	weightKg?: number;
	durationMin?: number;
	durationSec?: number;
	distanceKm?: number;
	timestamp: string;
	username: string;
}

export type { Execution };
