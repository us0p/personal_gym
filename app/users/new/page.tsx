'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { SexOptions } from '../../core/entities/user/user';
import { UserRepository, UserAlreadyExistsError } from '../../core/entities/user/user-repository';
import { UserWeightRepository } from '../../core/entities/user/user-weight-repository';
import { UserProfileService } from '../../core/entities/user/user-profile-service';
import { useUser } from '../../context/user-context';
import { useLocale } from '../../context/locale-context';
import { inputClass } from '../../lib/styles';

export default function NewUserPage() {
	const router = useRouter();
	const { user, refreshUser } = useUser();
	const { t } = useLocale();

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
				alert(t('createProfile.alreadyExists'));
				router.replace('/users');
			} else {
				alert(t('createProfile.failed'));
			}
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">{t('createProfile.title')}</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3">
					<input required name="username" placeholder={t('createProfile.usernamePlaceholder')} className={inputClass} />
					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1.5 block">{t('createProfile.dateOfBirth')}</label>
						<input required name="birthDate" type="date" className={`${inputClass} min-w-0`} />
					</div>
					<input required name="height" type="number" min={1} placeholder={t('createProfile.heightPlaceholder')} className={inputClass} />
					<input name="weight" type="number" min={1} step="0.1" placeholder={t('createProfile.weightPlaceholder')} className={inputClass} />
					<select name="sex" className={`${inputClass} appearance-none`}>
						<option value="MALE">{t('common.male')}</option>
						<option value="FEMALE">{t('common.female')}</option>
					</select>
					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base mt-2">
						{t('createProfile.submit')}
					</button>
				</form>
			</div>
		</div>
	);
}
