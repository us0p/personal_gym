'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import type { UserWeightEntry } from '../core/entities/user/user-weight-entry';
import { useLocale } from '../context/locale-context';

interface Props {
	entries: UserWeightEntry[];
}

function formatDate(date: Date | string) {
	return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function WeightChart({ entries }: Props) {
	const { t } = useLocale();
	const hasData = entries.length >= 2;

	const data = hasData ? entries.map((e) => ({
		date: formatDate(e.createdAt),
		weight: e.weight,
	})) : [];

	const weights = hasData ? entries.map((e) => e.weight) : [0];
	const min = Math.min(...weights);
	const max = Math.max(...weights);
	const padding = Math.max(1, (max - min) * 0.2);

	return (
		<div className="bg-zinc-900 rounded-2xl p-4">
			<p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-4">{t('weightChart.title')}</p>
			{!hasData ? (
				<p className="text-zinc-500 text-xs text-center py-10">{t('weightChart.noData')}</p>
			) : (
				<ResponsiveContainer width="100%" height={140}>
					<LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
							formatter={(v) => [t('weightChart.unit', { value: String(v) }), '']}
						/>
						<Line
							type="monotone"
							dataKey="weight"
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
