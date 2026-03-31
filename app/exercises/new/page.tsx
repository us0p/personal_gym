'use client'

import { useRouter } from 'next/navigation';
import Database from '../../core/infra/database';
import { Exercise, BODY_REGIONS } from '../../core/entities/exercise/exercise';

export default function NewExercisePage() {
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const bodyRegion = form.getAll('bodyRegion') as string[];
		if (bodyRegion.length === 0) {
			alert('Select at least one body region.');
			return;
		}
		const exercise: Exercise = {
			name: form.get('name') as string,
			type: form.get('type') as 'push' | 'pull',
			bodyRegion,
		};
		const db = await Database.getInstance();
		try {
			await db.add('exercise', exercise);
			router.push('/exercises');
		} catch {
			alert('An exercise with this name already exists.');
		}
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">New Exercise</h1>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						required
						name="name"
						placeholder="Exercise name"
						className="w-full bg-zinc-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base"
					/>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2 block">Type</label>
						<div className="flex gap-3">
							{(['push', 'pull'] as const).map((t) => (
								<label key={t} className="flex-1 cursor-pointer">
									<input type="radio" name="type" value={t} defaultChecked={t === 'push'} className="sr-only peer" />
									<div className="text-center py-3.5 rounded-xl bg-zinc-900 text-zinc-400 font-semibold capitalize peer-checked:bg-white peer-checked:text-black transition-colors">
										{t}
									</div>
								</label>
							))}
						</div>
					</div>

					<div>
						<label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3 block">Body Region</label>
						<div className="grid grid-cols-2 gap-2">
							{BODY_REGIONS.map((region) => (
								<label key={region} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 cursor-pointer active:bg-zinc-800">
									<input type="checkbox" name="bodyRegion" value={region} className="w-4 h-4 accent-white" />
									<span className="text-sm font-medium">{region}</span>
								</label>
							))}
						</div>
					</div>

					<button type="submit" className="w-full bg-white text-black rounded-xl py-4 font-bold text-base">
						Create Exercise
					</button>
				</form>
			</div>
		</div>
	);
}
