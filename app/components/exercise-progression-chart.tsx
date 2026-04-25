'use client'

import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import Database from '../core/infra/database';
import { WorkoutRepository } from '../core/entities/workout/workout-repository';
import { ExecutionRepository } from '../core/entities/execution/execution-repository';
import type { Execution } from '../core/entities/execution/execution';
import type { ExerciseMetric } from '../core/entities/exercise/exercise';
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

function getMetricValue(ex: Execution, metric: ExerciseMetric): number | undefined {
	switch (metric) {
		case 'reps': return ex.repNumber;
		case 'weight': return ex.weightKg;
		case 'duration': return ex.durationMin;
		case 'time': return ex.durationSec;
		case 'distance': return ex.distanceKm;
	}
}

function detectMetrics(executions: Execution[]): ExerciseMetric[] {
	const all: ExerciseMetric[] = ['reps', 'weight', 'duration', 'time', 'distance'];
	return all.filter((m) => executions.some((e) => getMetricValue(e, m) !== undefined));
}

export default function ExerciseProgressionChart({ username }: Props) {
	const { t } = useLocale();
	const [options, setOptions] = useState<string[]>([]);
	const [selected, setSelected] = useState<string>('');
	const [availableMetrics, setAvailableMetrics] = useState<ExerciseMetric[]>([]);
	const [selectedMetric, setSelectedMetric] = useState<ExerciseMetric | null>(null);
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
					for (const we of w.exercises) {
						if (!seen.has(we.name)) {
							seen.add(we.name);
							names.push(we.name);
						}
					}
				}

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

			const metrics = detectMetrics(filtered);
			setAvailableMetrics(metrics);

			const metric = metrics[0] ?? null;
			setSelectedMetric((prev) => (prev && metrics.includes(prev) ? prev : metric));

			if (!metric) {
				setChartData([]);
				return;
			}

			buildChart(filtered, metric);
		}
		loadChartData();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected]);

	function buildChart(executions: Execution[], metric: ExerciseMetric) {
		const byDate = new Map<string, number>();
		for (const e of executions) {
			const val = getMetricValue(e, metric);
			if (val === undefined) continue;
			const key = toLocalDateKey(e.timestamp);
			byDate.set(key, Math.max(byDate.get(key) ?? 0, val));
		}
		const data = Array.from(byDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => ({ date: formatDateKey(key), value }));
		setChartData(data);
	}

	async function handleMetricChange(metric: ExerciseMetric) {
		setSelectedMetric(metric);
		const db = await Database.getInstance();
		const all = await new ExecutionRepository(db).getAll();
		const filtered = all.filter((e) => e.exerciseName === selected);
		buildChart(filtered, metric);
	}

	if (!ready) return null;

	const unitKey: Record<ExerciseMetric, string> = {
		reps: t('exerciseChart.unitReps'),
		weight: t('exerciseChart.unitKg'),
		duration: t('exerciseChart.unitMin'),
		time: t('exerciseChart.unitSec'),
		distance: t('exerciseChart.unitKm'),
	};
	const unit = selectedMetric ? unitKey[selectedMetric] : '';

	const values = chartData.map((d) => d.value);
	const min = values.length ? Math.min(...values) : 0;
	const max = values.length ? Math.max(...values) : 0;
	const padding = Math.max(1, (max - min) * 0.2);

	return (
		<div className="bg-zinc-900 rounded-2xl p-4">
			<div className="flex items-center justify-between mb-3">
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

			{availableMetrics.length > 1 && (
				<div className="flex gap-2 mb-3 flex-wrap">
					{availableMetrics.map((m) => (
						<button
							key={m}
							onClick={() => handleMetricChange(m)}
							className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${m === selectedMetric ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
						>
							{t(`metric.${m}`)}
						</button>
					))}
				</div>
			)}

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
