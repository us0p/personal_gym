import { useState } from 'react';
import type { Exercise, ExerciseMetric } from '../core/entities/exercise/exercise';
import { METRICS_BY_TYPE } from '../core/entities/exercise/exercise';
import type { WorkoutExercise } from '../core/entities/workout/workout';

interface WorkoutExerciseSelectorHook {
	exerciseMetrics: Map<string, ExerciseMetric[]>;
	toggleExercise: (ex: Exercise, checked: boolean) => void;
	toggleMetric: (exerciseName: string, metric: ExerciseMetric, currentMetrics: ExerciseMetric[]) => void;
	setExercises: (exercises: WorkoutExercise[]) => void;
	getWorkoutExercises: () => WorkoutExercise[];
}

export function useWorkoutExerciseSelector(
	initialExercises: WorkoutExercise[] = [],
): WorkoutExerciseSelectorHook {
	const [exerciseMetrics, setExerciseMetrics] = useState<Map<string, ExerciseMetric[]>>(
		() => new Map(initialExercises.map((we) => [we.name, we.metrics])),
	);

	function toggleExercise(ex: Exercise, checked: boolean) {
		setExerciseMetrics((prev) => {
			const next = new Map(prev);
			if (checked) {
				next.set(ex.name, [METRICS_BY_TYPE[ex.type][0]]);
			} else {
				next.delete(ex.name);
			}
			return next;
		});
	}

	function toggleMetric(exerciseName: string, metric: ExerciseMetric, currentMetrics: ExerciseMetric[]) {
		setExerciseMetrics((prev) => {
			const next = new Map(prev);
			if (currentMetrics.includes(metric)) {
				if (currentMetrics.length === 1) return prev;
				next.set(exerciseName, currentMetrics.filter((m) => m !== metric));
			} else {
				next.set(exerciseName, [...currentMetrics, metric]);
			}
			return next;
		});
	}

	function setExercises(exercises: WorkoutExercise[]) {
		setExerciseMetrics(new Map(exercises.map((we) => [we.name, we.metrics])));
	}

	function getWorkoutExercises(): WorkoutExercise[] {
		return Array.from(exerciseMetrics.entries()).map(([name, metrics]) => ({ name, metrics }));
	}

	return { exerciseMetrics, toggleExercise, toggleMetric, setExercises, getWorkoutExercises };
}
