import type { Migration } from './types';

const migration: Migration = {
	version: 10,
	description: 'Convert workout.exercises from string[] to WorkoutExercise[]',
	up(_db, tx) {
		const exerciseStore = tx.objectStore('exercise');
		const workoutStore = tx.objectStore('workout');

		exerciseStore.getAll().onsuccess = (evt) => {
			const exercises = (evt.target as IDBRequest<Array<{ name: string; type: string }>>).result;
			const typeMap = new Map(exercises.map((e) => [e.name, e.type]));

			workoutStore.getAll().onsuccess = (evt2) => {
				const workouts = (evt2.target as IDBRequest<Array<Record<string, unknown> & { exercises: string[] }>>).result;
				for (const w of workouts) {
					const updated = {
						...w,
						exercises: w.exercises.map((name) => ({
							name,
							metrics: typeMap.get(name) === 'cardio' ? ['duration'] : ['reps'],
						})),
					};
					workoutStore.put(updated);
				}
			};
		};
	},
};

export default migration;
