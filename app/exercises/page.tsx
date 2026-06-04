'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { Exercise } from '../core/entities/exercise/exercise';
import { ExerciseRepository } from '../core/entities/exercise/exercise-repository';
import { ExerciseService } from '../core/services/exercise-service';
import { useLocale } from '../context/locale-context';

export default function ExercisesPage() {
	const { t } = useLocale();
	const [exercises, setExercises] = useState<Exercise[]>([]);

	async function load() {
		const db = await Database.getInstance();
		setExercises(await new ExerciseRepository(db).getAll());
	}

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load();
	}, []);

	async function handleDelete(name: string) {
		if (!confirm(t('exercises.deleteConfirm', { name }))) return;
		const db = await Database.getInstance();
		await new ExerciseService(db).delete(name);
		void load();
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">{t('exercises.title')}</h1>
					<Link href="/exercises/new" className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold">
						{t('exercises.new')}
					</Link>
				</div>

				<div className="space-y-3">
					{exercises.length === 0 && (
						<p className="text-zinc-500 text-center py-12">{t('exercises.empty')}</p>
					)}
					{exercises.map((ex) => (
						<div key={ex.name} className="bg-zinc-900 rounded-2xl p-4">
							<div className="flex items-start justify-between">
								<div>
									<p className="font-semibold">{ex.name}</p>
									<p className="text-zinc-400 text-sm mt-0.5 capitalize">
										{t(`exerciseType.${ex.type}`)}
										{ex.bodyRegion.length > 0 ? ` · ${ex.bodyRegion.map((r) => t(`bodyRegion.${r}`)).join(', ')}` : ''}
									</p>
								</div>
								<span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${ex.type === 'push' ? 'bg-orange-500/20 text-orange-400' : ex.type === 'pull' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
									{t(`exerciseType.${ex.type}`)}
								</span>
							</div>
							<div className="flex gap-2 mt-3">
								<Link
									href={`/exercises/${encodeURIComponent(ex.name)}`}
									className="text-sm bg-zinc-800 text-white rounded-xl px-4 py-2 font-medium"
								>
									{t('common.edit')}
								</Link>
								<button
									onClick={() => handleDelete(ex.name)}
									className="text-sm bg-zinc-800 text-red-400 rounded-xl px-4 py-2 font-medium ml-auto"
								>
									{t('common.delete')}
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
