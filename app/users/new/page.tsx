'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { SexOptions } from '../../core/entities/user/user';
import { UserRepository, UserAlreadyExistsError } from '../../core/entities/user/user-repository';
import { UserWeightRepository } from '../../core/entities/user/user-weight-repository';
import { UserProfileService } from '../../core/entities/user/user-profile-service';
import { useUser } from '../../context/user-context';
import { inputClass } from '../../lib/styles';

export default function NewUserPage() {
	const router = useRouter();
	const { user, refreshUser } = useUser();

	useEffect(() => {
		if (user) router.replace('/users');
	}, [user, router]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const weightRaw = form.get('weight') as string;
		const db = await Database.getInstance();
		const service = new UserProfileService(
			new UserRepository(db),
			new UserWeightRepository(db),
		);
		try {
			await service.create({
				username: form.get('username') as string,
				sex: form.get('sex') as SexOptions,
				birthDate: new Date(form.get('birthDate') as string),
				height: Number(form.get('height')),
				weight: weightRaw ? Number(weightRaw) : undefined,
			});
			await refreshUser();
			router.push('/users');
		} catch (err) {
			if (err instanceof UserAlreadyExistsError) {
				alert('A profile already exists. Only one profile is allowed.');
				router.replace('/users');
			} else {
				alert('Failed to create profile. Please try again.');
			}
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">Create Profile</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<input required name="username" placeholder="Username" className={inputClass} />
					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1.5 block">Date of Birth</label>
						<input required name="birthDate" type="date" className={`${inputClass} min-w-0`} />
					</div>
					<input required name="height" type="number" min={1} placeholder="Height (cm)" className={inputClass} />
					<input name="weight" type="number" min={1} step="0.1" placeholder="Weight (kg)" className={inputClass} />
					<select name="sex" className={`${inputClass} appearance-none`}>
						<option value="MALE">Male</option>
						<option value="FEMALE">Female</option>
					</select>
					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base mt-2">
						Create Profile
					</button>
				</form>
			</div>
		</div>
	);
}
