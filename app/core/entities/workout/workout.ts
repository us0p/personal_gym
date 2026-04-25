import type { ExerciseMetric } from '../exercise/exercise';

enum WeekDay {
	MONDAY = 'MONDAY',
	TUESDAY = 'TUESDAY',
	WEDNESDAY = 'WEDNESDAY',
	THURSDAY = 'THURSDAY',
	FRIDAY = 'FRIDAY',
	SATURDAY = 'SATURDAY',
	SUNDAY = 'SUNDAY',
}

interface WorkoutExercise {
	name: string;
	metrics: ExerciseMetric[];
}

interface Workout {
	name: string;
	exercises: WorkoutExercise[];
	username: string;
	weekDays?: WeekDay[];
}

export { WeekDay };
export type { Workout, WorkoutExercise };
