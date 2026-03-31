'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { User, SexOptions } from '../../core/entities/user/user';
import { useUser } from '../../context/user-context';

const inputClass = "w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base";

export default function EditUserPage() {
	const params = useParams();
	const router = useRouter();
	const { currentUser, setCurrentUser } = useUser();
	const username = decodeURIComponent(params.username as string);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const found = await db.get<User>('users', username);
			setUser(found ?? null);
		}
		load();
	}, [username]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!user) return;
		const form = new FormData(e.currentTarget);
		const updated = {
			username: user.username,
			sex: form.get('sex') as SexOptions,
			age: Number(form.get('age')),
			weight: Number(form.get('weight')),
			height: Number(form.get('height')),
		};
		const db = await Database.getInstance();
		await db.put('users', updated);
		if (currentUser?.username === username) setCurrentUser(updated as never);
		router.push('/users');
	}

	async function handleDelete() {
		if (!confirm(`Delete user "${username}"?`)) return;
		const db = await Database.getInstance();
		await db.delete('users', username);
		if (currentUser?.username === username) setCurrentUser(null);
		router.push('/users');
	}

	if (!user) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">Loading…</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<h1 className="text-2xl font-bold">Edit User</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">Delete</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="bg-zinc-900 rounded-xl px-4 py-3.5">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Username</p>
						<p className="text-white font-semibold mt-0.5">{user.username}</p>
					</div>
					<input required name="age" type="number" min={1} max={120} defaultValue={user.age} placeholder="Age" className={inputClass} />
					<input required name="weight" type="number" min={1} step="0.1" defaultValue={user.weight} placeholder="Weight (kg)" className={inputClass} />
					<input required name="height" type="number" min={1} defaultValue={user.height} placeholder="Height (cm)" className={inputClass} />
					<select name="sex" defaultValue={user.sex} className={`${inputClass} appearance-none`}>
						<option value="MALE">Male</option>
						<option value="FEMALE">Female</option>
					</select>
					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base mt-2">
						Save Changes
					</button>
				</form>
			</div>
		</div>
	);
}
