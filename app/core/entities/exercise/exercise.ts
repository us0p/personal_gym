type ExerciseType = 'push' | 'pull' | 'static' | 'cardio';

type ExerciseMetric = 'reps' | 'weight' | 'time' | 'duration' | 'distance';

interface Exercise {
	name: string;
	bodyRegion: string[];
	type: ExerciseType;
}

const BODY_REGIONS_BY_TYPE: Record<ExerciseType, readonly string[]> = {
	push: ['Chest', 'Shoulders', 'Triceps', 'Abs'],
	pull: ['Back', 'Biceps', 'Shoulders', 'Abs'],
	static: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'],
	cardio: [],
};

const METRICS_BY_TYPE: Record<ExerciseType, readonly ExerciseMetric[]> = {
	push: ['reps', 'weight'],
	pull: ['reps', 'weight'],
	static: ['time', 'weight'],
	cardio: ['duration', 'distance'],
};

export type { Exercise, ExerciseType, ExerciseMetric };
export { BODY_REGIONS_BY_TYPE, METRICS_BY_TYPE };
