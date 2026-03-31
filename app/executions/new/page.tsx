'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { Execution } from '../../core/entities/execution/execution';
import { Workout } from '../../core/entities/workout/workout';
import { Exercise } from '../../core/entities/exercise/exercise';

const selectClass = "w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none appearance-none text-base";

export default function NewExecutionPage() {
	const router = useRouter();
	const [workouts, setWorkouts] = useState<Workout[]>([]);
	const [allExercises, setAllExercises] = useState<Exercise[]>([]);
	const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
	const [selectedWorkout, setSelectedWorkout] = useState('');

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const [ws, exs] = await Promise.all([
				db.getAll<Workout>('workout'),
				db.getAll<Exercise>('exercise'),
			]);
			setWorkouts(ws);
			setAllExercises(exs);
			setFilteredExercises(exs);
		}
		load();
	}, []);

	function handleWorkoutChange(name: string) {
		setSelectedWorkout(name);
		if (!name) {
			setFilteredExercises(allExercises);
			return;
		}
		const workout = workouts.find((w) => w.name === name);
		if (workout && workout.exercises.length > 0) {
			setFilteredExercises(allExercises.filter((ex) => workout.exercises.includes(ex.name)));
		} else {
			setFilteredExercises(allExercises);
		}
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const execution: Omit<Execution, 'id'> = {
			workoutName: form.get('workoutName') as string,
			exerciseName: form.get('exerciseName') as string,
			repNumber: Number(form.get('repNumber')),
			timestamp: new Date().toISOString(),
		};
		const db = await Database.getInstance();
		await db.add('execution', execution);
		router.push('/executions');
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">Log Set</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Workout</label>
						<select
							name="workoutName"
							required
							value={selectedWorkout}
							onChange={(e) => handleWorkoutChange(e.target.value)}
							className={selectClass}
						>
							<option value="">Select workout…</option>
							{workouts.map((w) => (
								<option key={w.name} value={w.name}>{w.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Exercise</label>
						<select name="exerciseName" required className={selectClass}>
							<option value="">Select exercise…</option>
							{filteredExercises.map((ex) => (
								<option key={ex.name} value={ex.name}>{ex.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Reps</label>
						<input
							required
							name="repNumber"
							type="number"
							min={1}
							placeholder="How many reps?"
							className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
						/>
					</div>

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base mt-2">
						Log Set
					</button>
				</form>
			</div>
		</div>
	);
}
