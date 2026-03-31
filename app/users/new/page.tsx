'use client'

import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { SexOptions } from '../../core/entities/user/user';
import { useUser } from '../../context/user-context';

const inputClass = "w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base";

export default function NewUserPage() {
	const router = useRouter();
	const { setCurrentUser } = useUser();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const user = {
			username: form.get('username') as string,
			sex: form.get('sex') as SexOptions,
			age: Number(form.get('age')),
			weight: Number(form.get('weight')),
			height: Number(form.get('height')),
		};
		const db = await Database.getInstance();
		try {
			await db.add('users', user);
			setCurrentUser(user as never);
			router.push('/users');
		} catch {
			alert('Username already exists. Choose a different one.');
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">New User</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<input required name="username" placeholder="Username" className={inputClass} />
					<input required name="age" type="number" min={1} max={120} placeholder="Age" className={inputClass} />
					<input required name="weight" type="number" min={1} step="0.1" placeholder="Weight (kg)" className={inputClass} />
					<input required name="height" type="number" min={1} placeholder="Height (cm)" className={inputClass} />
					<select name="sex" className={`${inputClass} appearance-none`}>
						<option value="MALE">Male</option>
						<option value="FEMALE">Female</option>
					</select>
					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base mt-2">
						Create User
					</button>
				</form>
			</div>
		</div>
	);
}
