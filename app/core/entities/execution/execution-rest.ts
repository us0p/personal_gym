interface ExecutionRest {
	id?: number;
	executionId: number;
	workoutName: string;
	timestamp: string;
	durationSeconds: number;
}

export type { ExecutionRest };
