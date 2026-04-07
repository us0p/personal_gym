'use client'

import { useEffect, useState } from 'react';
import Database from '../core/infra/database';
import type { Execution } from '../core/entities/execution/execution';
import type { ExecutionRest } from '../core/entities/execution/execution-rest';
import type { ExecutionSpeed } from '../core/entities/execution/execution-speed';

interface Workout {
	name: string;
	exercises: string[];
}

export function computeAverageRest(
	executions: Pick<Execution, 'id' | 'workoutName' | 'exerciseName'>[],
	restEntries: Pick<ExecutionRest, 'executionId' | 'durationSeconds'>[],
	workoutName: string,
	exerciseName: string,
): number | null {
	const matchingIds = new Set<number>();
	for (const ex of executions) {
		if (ex.workoutName === workoutName && ex.exerciseName === exerciseName) {
			matchingIds.add(ex.id!);
		}
	}

	const matching = restEntries.filter((r) => matchingIds.has(r.executionId));
	if (matching.length === 0) return null;

	const sum = matching.reduce((acc, r) => acc + r.durationSeconds, 0);
	return Math.round((sum / matching.length) * 100) / 100;
}

export function computeAverageSpeed(
	entries: Pick<ExecutionSpeed, 'workoutName' | 'exerciseName' | 'executionDuration'>[],
	workoutName: string,
	exerciseName: string,
): number | null {
	const matching = entries.filter(
		(e) => e.workoutName === workoutName && e.exerciseName === exerciseName,
	);
	if (matching.length === 0) return null;

	const sum = matching.reduce((acc, e) => acc + e.executionDuration, 0);
	return Math.round((sum / matching.length) * 100) / 100;
}

export default function WorkoutExerciseMetrics() {
	const [workouts, setWorkouts] = useState<Workout[]>([]);
	const [selectedWorkout, setSelectedWorkout] = useState('');
	const [selectedExercise, setSelectedExercise] = useState('');
	const [avgRest, setAvgRest] = useState<number | null>(null);
	const [avgSpeed, setAvgSpeed] = useState<number | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		async function loadWorkouts() {
			try {
				const db = await Database.getInstance();
				const all = await db.getAll<Workout>('workout');
				setWorkouts(all);
				if (all.length > 0) {
					setSelectedWorkout(all[0].name);
					setSelectedExercise(all[0].exercises[0] ?? '');
				}
			} finally {
				setReady(true);
			}
		}
		loadWorkouts();
	}, []);

	useEffect(() => {
		if (!selectedWorkout || !selectedExercise) return;
		async function loadMetrics() {
			const db = await Database.getInstance();
			const [executions, restEntries, speedEntries] = await Promise.all([
				db.getAll<Execution>('execution'),
				db.getAll<ExecutionRest>('executionRest'),
				db.getAll<ExecutionSpeed>('executionSpeed'),
			]);
			setAvgRest(computeAverageRest(executions, restEntries, selectedWorkout, selectedExercise));
			setAvgSpeed(computeAverageSpeed(speedEntries, selectedWorkout, selectedExercise));
		}
		loadMetrics();
	}, [selectedWorkout, selectedExercise]);

	const exercises = workouts.find((w) => w.name === selectedWorkout)?.exercises ?? [];

	function handleWorkoutChange(name: string) {
		setSelectedWorkout(name);
		const workout = workouts.find((w) => w.name === name);
		setSelectedExercise(workout?.exercises[0] ?? '');
	}

	if (!ready) return null;

	return (
		<div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p
					data-testid="metrics-heading"
					className="text-zinc-500 text-xs uppercase tracking-widest font-semibold"
				>
					Workout Exercise Metrics
				</p>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-2">
				<select
					value={selectedWorkout}
					onChange={(e) => handleWorkoutChange(e.target.value)}
					data-testid="metrics-workout-select"
					className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
				>
					{workouts.map((w) => (
						<option key={w.name} value={w.name}>{w.name}</option>
					))}
				</select>
				<select
					value={selectedExercise}
					onChange={(e) => setSelectedExercise(e.target.value)}
					data-testid="metrics-exercise-select"
					className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
				>
					{exercises.map((ex) => (
						<option key={ex} value={ex}>{ex}</option>
					))}
				</select>
			</div>

			{/* Metrics list */}
			<ul className="space-y-2">
				<li className="flex items-center justify-between">
					<span className="text-zinc-400 text-sm">Average Exercise Rest</span>
					<span
						data-testid="metrics-avg-rest"
						className="text-white font-semibold text-sm tabular-nums"
					>
						{avgRest !== null ? `${avgRest}s` : '—'}
					</span>
				</li>
				<li className="flex items-center justify-between">
					<span className="text-zinc-400 text-sm">Average Execution Speed</span>
					<span
						data-testid="metrics-avg-speed"
						className="text-white font-semibold text-sm tabular-nums"
					>
						{avgSpeed !== null ? `${avgSpeed}s` : '—'}
					</span>
				</li>
			</ul>
		</div>
	);
}
