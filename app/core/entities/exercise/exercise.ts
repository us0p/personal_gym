type ExerciseType = 'push' | 'pull' | 'cardio';

interface Exercise {
	name: string;
	bodyRegion: string[];
	type: ExerciseType;
}

const BODY_REGIONS = [
	'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
	'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
] as const;

export type { Exercise, ExerciseType };
export { BODY_REGIONS };
