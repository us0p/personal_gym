'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { Exercise, ExerciseType, BODY_REGIONS_BY_TYPE } from '../../core/entities/exercise/exercise';
import { ExerciseService } from '../../core/services/exercise-service';
import { useLocale } from '../../context/locale-context';
import { inputClass } from '../../lib/styles';

export default function EditExercisePage() {
	const params = useParams();
	const router = useRouter();
	const { t } = useLocale();
	const name = decodeURIComponent(params.name as string);
	const [exercise, setExercise] = useState<Exercise | null>(null);
	const [type, setType] = useState<ExerciseType>('push');

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const found = await db.get<Exercise>('exercise', name);
			if (found) {
				setExercise(found);
				setType(found.type);
			}
		}
		load();
	}, [name]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!exercise) return;
		const form = new FormData(e.currentTarget);
		const newName = (form.get('name') as string).trim();
		const bodyRegion = type === 'cardio' ? [] : form.getAll('bodyRegion') as string[];
		const updated: Exercise = { name: newName, type, bodyRegion };
		const db = await Database.getInstance();
		try {
			await new ExerciseService(db).rename(exercise.name, updated);
			router.push('/exercises');
		} catch {
			alert(t('editExercise.alreadyExists'));
		}
	}

	async function handleDelete() {
		if (!confirm(t('editExercise.deleteConfirm', { name }))) return;
		const db = await Database.getInstance();
		await new ExerciseService(db).delete(name);
		router.push('/exercises');
	}

	if (!exercise) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">{t('common.loading')}</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
						<h1 className="text-2xl font-bold">{t('editExercise.title')}</h1>
					</div>
					<button onClick={handleDelete} className="text-red-400 text-sm font-medium">{t('common.delete')}</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						defaultValue={exercise.name}
						placeholder={t('editExercise.namePlaceholder')}
						className={inputClass}
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">{t('newExercise.type')}</label>
						<div className="flex gap-3">
							{(['push', 'pull', 'static', 'cardio'] as const).map((ty) => (
								<label key={ty} className="flex-1 cursor-pointer">
									<input
										type="radio"
										name="type"
										value={ty}
										checked={type === ty}
										onChange={() => setType(ty)}
										className="sr-only peer"
									/>
									<div className="text-center py-3.5 rounded-xl bg-zinc-900 text-zinc-400 font-semibold capitalize peer-checked:bg-white peer-checked:text-black transition-colors">
										{t(`exerciseType.${ty}`)}
									</div>
								</label>
							))}
						</div>
					</div>

					{type !== 'cardio' && (
						<div>
							<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">{t('newExercise.bodyRegion')}</label>
							<div key={type} className="grid grid-cols-2 gap-2">
								{BODY_REGIONS_BY_TYPE[type].map((region) => (
									<label key={region} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 cursor-pointer active:bg-zinc-800">
										<input
											type="checkbox"
											name="bodyRegion"
											value={region}
											defaultChecked={exercise.bodyRegion.includes(region)}
											className="w-4 h-4 accent-white"
										/>
										<span className="text-sm font-medium">{t(`bodyRegion.${region}`)}</span>
									</label>
								))}
							</div>
						</div>
					)}

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base">
						{t('editExercise.submit')}
					</button>
				</form>
			</div>
		</div>
	);
}
