'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from './context/user-context';
import Database from './core/infra/database';

export default function Dashboard() {
	const { currentUser } = useUser();
	const [stats, setStats] = useState({ workouts: 0, exercises: 0, executions: 0 });

	useEffect(() => {
		async function loadStats() {
			const db = await Database.getInstance();
			const [workouts, exercises, executions] = await Promise.all([
				db.getAll('workout'),
				db.getAll('exercise'),
				db.getAll('execution'),
			]);
			setStats({
				workouts: workouts.length,
				exercises: exercises.length,
				executions: executions.length,
			});
		}
		loadStats();
	}, []);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-7">
				<div>
					<p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">Personal Gym</p>
					<h1 className="text-3xl font-bold mt-1">
						{currentUser ? `Hey, ${currentUser.username}` : 'Welcome'}
					</h1>
				</div>

				{!currentUser && (
					<Link href="/users" className="flex items-center justify-between bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
						<div>
							<p className="text-zinc-400 text-sm">No user selected</p>
							<p className="text-white font-medium mt-0.5">Select or create a profile</p>
						</div>
						<span className="text-zinc-400 text-xl">→</span>
					</Link>
				)}

				<div className="grid grid-cols-3 gap-3">
					<div className="bg-zinc-900 rounded-2xl p-4 text-center">
						<p className="text-3xl font-bold">{stats.workouts}</p>
						<p className="text-zinc-500 text-xs mt-1 font-medium uppercase tracking-wide">Workouts</p>
					</div>
					<div className="bg-zinc-900 rounded-2xl p-4 text-center">
						<p className="text-3xl font-bold">{stats.exercises}</p>
						<p className="text-zinc-500 text-xs mt-1 font-medium uppercase tracking-wide">Exercises</p>
					</div>
					<div className="bg-zinc-900 rounded-2xl p-4 text-center">
						<p className="text-3xl font-bold">{stats.executions}</p>
						<p className="text-zinc-500 text-xs mt-1 font-medium uppercase tracking-wide">Sets</p>
					</div>
				</div>

				<div className="space-y-3">
					<h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Quick actions</h2>
					<Link
						href="/executions/new"
						className="flex items-center justify-between bg-white text-black rounded-2xl px-5 py-4 font-bold text-lg"
					>
						<span>Log a Set</span>
						<span>+</span>
					</Link>
					<Link
						href="/workouts/new"
						className="flex items-center justify-between bg-zinc-900 text-white rounded-2xl px-5 py-4 font-semibold"
					>
						<span>New Workout</span>
						<span className="text-zinc-500">→</span>
					</Link>
					<Link
						href="/exercises/new"
						className="flex items-center justify-between bg-zinc-900 text-white rounded-2xl px-5 py-4 font-semibold"
					>
						<span>New Exercise</span>
						<span className="text-zinc-500">→</span>
					</Link>
				</div>
			</div>
		</div>
	);
}
