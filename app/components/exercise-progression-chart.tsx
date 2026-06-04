'use client'

import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import Database from '../core/infra/database';
import { ExerciseProgressionService } from '../core/services/exercise-progression-service';
import type { ChartPoint } from '../core/services/exercise-progression-service';
import type { ExerciseMetric } from '../core/entities/exercise/exercise';
import { useLocale } from '../context/locale-context';

interface Props {
	username: string;
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
				const names = await new ExerciseProgressionService(db).getExerciseNames();
				setOptions(names);
				setSelected(names[0] ?? '');
			} finally {
				setReady(true);
			}
		}
		 
		void loadOptions();
	}, [username]);

	useEffect(() => {
		if (!selected) return;
		async function loadChartData() {
			const db = await Database.getInstance();
			const svc = new ExerciseProgressionService(db);
			const metrics = await svc.getAvailableMetrics(selected);
			setAvailableMetrics(metrics);
			const metric = metrics[0] ?? null;
			setSelectedMetric((prev) => (prev && metrics.includes(prev) ? prev : metric));
			if (!metric) {
				setChartData([]);
				return;
			}
			setChartData(await svc.buildChartData(selected, metric));
		}
		 
		void loadChartData();
	}, [selected]);

	async function handleMetricChange(metric: ExerciseMetric) {
		setSelectedMetric(metric);
		const db = await Database.getInstance();
		setChartData(await new ExerciseProgressionService(db).buildChartData(selected, metric));
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
