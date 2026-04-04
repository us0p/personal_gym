interface Execution {
	id?: number;
	workoutName: string;
	exerciseName: string;
	repNumber?: number;
	durationMin?: number;
	timestamp: string;
	username: string;
}

export type { Execution };
