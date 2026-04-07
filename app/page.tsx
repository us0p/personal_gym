'use client'

import { useEffect, useState } from 'react';
import { useUser } from './context/user-context';
import Database from './core/infra/database';
import { UserWeightRepository } from './core/entities/user/user-weight-repository';
import type { UserWeightEntry } from './core/entities/user/user-weight-entry';
import WeightChart from './components/weight-chart';
import ExerciseProgressionChart from './components/exercise-progression-chart';
import WorkoutExerciseMetrics from './components/workout-exercise-metrics';

export default function Dashboard() {
	const { user } = useUser();
	const [weightHistory, setWeightHistory] = useState<UserWeightEntry[]>([]);

	useEffect(() => {
		if (!user) return;
		async function loadWeightHistory() {
			const db = await Database.getInstance();
			const entries = await new UserWeightRepository(db).getAllByUser(user!.username);
			setWeightHistory(entries);
		}
		loadWeightHistory();
	}, [user]);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-7">
				<div>
					<p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Personal Gym</p>
					<h1 className="text-3xl font-bold mt-1">
						{user ? `Hey, ${user.username}` : 'Welcome'}
					</h1>
				</div>

				<WeightChart entries={weightHistory} />

				{user && <ExerciseProgressionChart username={user.username} />}
				<WorkoutExerciseMetrics />
			</div>
		</div>
	);
}
