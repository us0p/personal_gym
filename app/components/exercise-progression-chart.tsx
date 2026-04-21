'use client'

import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import Database from '../core/infra/database';
import { WorkoutRepository } from '../core/entities/workout/workout-repository';
import { ExecutionRepository } from '../core/entities/execution/execution-repository';
import type { Exercise } from '../core/entities/exercise/exercise';
import { useLocale } from '../context/locale-context';

interface Props {
	username: string;
}

interface ChartPoint {
	date: string;
	value: number;
}

function toLocalDateKey(isoTimestamp: string): string {
	const d = new Date(isoTimestamp);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function formatDateKey(key: string): string {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ExerciseProgressionChart({ username }: Props) {
	const { t } = useLocale();
	const [options, setOptions] = useState<string[]>([]);
	const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map());
	const [selected, setSelected] = useState<string>('');
	const [chartData, setChartData] = useState<ChartPoint[]>([]);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		async function loadOptions() {
			try {
				const db = await Database.getInstance();
				const workouts = await new WorkoutRepository(db).getAll();

				const seen = new Set<string>();
				const names: string[] = [];
				for (const w of workouts) {
					for (const ex of w.exercises) {
						if (!seen.has(ex)) {
							seen.add(ex);
							names.push(ex);
						}
					}
				}

				const allExercises = await db.getAll<Exercise>('exercise');
				const map = new Map(allExercises.map((e) => [e.name, e]));

				setExerciseMap(map);
				setOptions(names);
				setSelected(names[0] ?? '');
			} finally {
				setReady(true);
			}
		}
		loadOptions();
	}, [username]);

	useEffect(() => {
		if (!selected) return;
		async function loadChartData() {
			const db = await Database.getInstance();
			const all = await new ExecutionRepository(db).getAll();
			const filtered = all.filter((e) => e.exerciseName === selected);

			const isCardio = exerciseMap.get(selected)?.type === 'cardio';

			const byDate = new Map<string, number>();
			for (const e of filtered) {
				const key = toLocalDateKey(e.timestamp);
				const val = isCardio ? (e.durationMin ?? 0) : (e.repNumber ?? 0);
				byDate.set(key, (byDate.get(key) ?? 0) + val);
			}

			const data = Array.from(byDate.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([key, value]) => ({ date: formatDateKey(key), value }));

			setChartData(data);
		}
		loadChartData();
	}, [selected, exerciseMap]);

	if (!ready) return null;

	const isCardio = exerciseMap.get(selected)?.type === 'cardio';
	const unit = isCardio ? t('exerciseChart.unitMin') : t('exerciseChart.unitReps');

	const values = chartData.map((d) => d.value);
	const min = values.length ? Math.min(...values) : 0;
	const max = values.length ? Math.max(...values) : 0;
	const padding = Math.max(1, (max - min) * 0.2);

	return (
		<div className="bg-zinc-900 rounded-2xl p-4">
			<div className="flex items-center justify-between mb-4">
				<p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold">{t('exerciseChart.title')}</p>
				{options.length > 0 && (
					<select
						value={selected}
						onChange={(e) => setSelected(e.target.value)}
						className="bg-zinc-800 text-white text-xs rounded-lg px-2 py-1 outline-none max-w-[55%]"
					>
						{options.map((name) => (
							<option key={name} value={name}>{name}</option>
						))}
					</select>
				)}
			</div>

			{options.length === 0 || chartData.length === 0 ? (
				<p className="text-zinc-500 text-xs text-center py-10">{t('exerciseChart.noData')}</p>
			) : (
				<ResponsiveContainer width="100%" height={140}>
					<LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
						<XAxis
							dataKey="date"
							tick={{ fill: '#71717a', fontSize: 10 }}
							tickLine={false}
							axisLine={false}
							interval="preserveStartEnd"
						/>
						<YAxis
							tick={{ fill: '#71717a', fontSize: 10 }}
							tickLine={false}
							axisLine={false}
							domain={[min - padding, max + padding]}
							tickCount={3}
						/>
						<Tooltip
							contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8, fontSize: 12 }}
							labelStyle={{ color: '#a1a1aa' }}
							itemStyle={{ color: '#ffffff' }}
							formatter={(v) => [`${v} ${unit}`, '']}
						/>
						<Line
							type="monotone"
							dataKey="value"
							stroke="#ffffff"
							strokeWidth={1.5}
							dot={{ r: 3, fill: '#ffffff', strokeWidth: 0 }}
							activeDot={{ r: 4, fill: '#ffffff', strokeWidth: 0 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}
