'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { SexOptions } from '../../core/entities/user/user';
import { UserRepository, UserNotFoundError } from '../../core/entities/user/user-repository';
import { UserWeightRepository } from '../../core/entities/user/user-weight-repository';
import { UserProfileService, UserProfile } from '../../core/entities/user/user-profile-service';
import { useUser } from '../../context/user-context';
import { toDateInputValue } from '../utils';
import { inputClass } from '../../lib/styles';

export default function EditUserPage() {
	const router = useRouter();
	const { refreshUser } = useUser();
	const [profile, setProfile] = useState<UserProfile | null>(null);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const service = new UserProfileService(
				new UserRepository(db),
				new UserWeightRepository(db),
			);
			const found = await service.getProfile();
			setProfile(found ?? null);
		}
		load();
	}, []);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!profile) return;
		const form = new FormData(e.currentTarget);
		const weightRaw = form.get('weight') as string;
		const db = await Database.getInstance();
		const service = new UserProfileService(
			new UserRepository(db),
			new UserWeightRepository(db),
		);
		try {
			await service.updateProfile({
				sex: form.get('sex') as SexOptions,
				birthDate: new Date(form.get('birthDate') as string),
				height: Number(form.get('height')),
				weight: weightRaw ? Number(weightRaw) : undefined,
			});
			await refreshUser();
			router.push('/users');
		} catch (err) {
			if (err instanceof UserNotFoundError) {
				alert('No profile found.');
				router.replace('/users');
			} else {
				alert('Failed to save changes. Please try again.');
			}
		}
	}

	async function handleDelete() {
		if (!confirm('Delete your profile? This cannot be undone.')) return;
		const db = await Database.getInstance();
		const repo = new UserRepository(db);
		await repo.delete();
		await refreshUser();
		router.push('/users');
	}

	if (!profile) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">Loading…</p>
		</div>
	);

	const { user } = profile;

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<h1 className="text-2xl font-bold">Edit Profile</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">Delete</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="bg-zinc-900 rounded-xl px-4 py-3.5">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Username</p>
						<p className="text-white font-semibold mt-0.5">{user.username}</p>
					</div>
					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1.5 block">Date of Birth</label>
						<input
							required
							name="birthDate"
							type="date"
							defaultValue={toDateInputValue(user.birthDate)}
							className={`${inputClass} min-w-0`}
						/>
					</div>
					<input required name="height" type="number" min={1} defaultValue={user.height} placeholder="Height (cm)" className={inputClass} />
					<input
						name="weight"
						type="number"
						min={1}
						step="0.1"
						defaultValue={profile.weight ?? ''}
						placeholder="Weight (kg)"
						className={inputClass}
					/>
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
