'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { User } from '../core/entities/user/user';
import { useUser } from '../context/user-context';

export default function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const { currentUser, setCurrentUser } = useUser();

	async function load() {
		const db = await Database.getInstance();
		setUsers(await db.getAll<User>('users'));
	}

	useEffect(() => { load(); }, []);

	async function handleDelete(username: string) {
		if (!confirm(`Delete user "${username}"?`)) return;
		const db = await Database.getInstance();
		await db.delete('users', username);
		if (currentUser?.username === username) setCurrentUser(null);
		load();
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Users</h1>
					<Link href="/users/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
						+ New
					</Link>
				</div>

				{currentUser && (
					<div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-700">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Active User</p>
						<p className="text-lg font-bold mt-1">{currentUser.username}</p>
						<p className="text-zinc-400 text-sm">
							{currentUser.sex === 'MALE' ? 'Male' : 'Female'} · {currentUser.age}y · {currentUser.weight}kg · {currentUser.height}cm
						</p>
						<button
							onClick={() => setCurrentUser(null)}
							className="text-xs text-zinc-500 mt-3 underline"
						>
							Sign out
						</button>
					</div>
				)}

				<div className="space-y-3">
					{users.length === 0 && (
						<p className="text-zinc-500 text-center py-12">No users yet. Create one to get started.</p>
					)}
					{users.map((user) => (
						<div key={user.username} className="bg-zinc-900 rounded-2xl p-4">
							<div className="flex items-start justify-between">
								<div>
									<p className="font-semibold">{user.username}</p>
									<p className="text-zinc-400 text-sm mt-0.5">
										{user.sex === 'MALE' ? 'Male' : 'Female'} · {user.age}y · {user.weight}kg · {user.height}cm
									</p>
								</div>
								{currentUser?.username === user.username && (
									<span className="text-xs bg-white text-black rounded-full px-2.5 py-1 font-semibold">Active</span>
								)}
							</div>
							<div className="flex items-center gap-2 mt-3">
								{currentUser?.username !== user.username && (
									<button
										onClick={() => setCurrentUser(user)}
										className="text-sm bg-zinc-800 text-white rounded-xl px-4 py-2 font-medium"
									>
										Set Active
									</button>
								)}
								<Link
									href={`/users/${encodeURIComponent(user.username)}`}
									className="text-sm bg-zinc-800 text-white rounded-xl px-4 py-2 font-medium"
								>
									Edit
								</Link>
								<button
									onClick={() => handleDelete(user.username)}
									className="text-sm bg-zinc-800 text-red-400 rounded-xl px-4 py-2 font-medium ml-auto"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
