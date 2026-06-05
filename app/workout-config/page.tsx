'use client'

import { useEffect, useState, useCallback } from 'react';
import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	TouchSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import Database from '../core/infra/database';
import { WorkoutRepository } from '../core/entities/workout/workout-repository';
import { WorkoutConfigRepository } from '../core/entities/workout-config/workout-config-repository';
import type { RoutineEntry, WorkoutConfig } from '../core/entities/workout-config/workout-config';
import { WeekDay } from '../core/entities/workout/workout';
import { useUser } from '../context/user-context';
import { useLocale } from '../context/locale-context';
import { useToast } from '../context/toast-context';

const WEEK_DAYS_ORDER: WeekDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

type SequentialEntry = RoutineEntry & { _id: string };

function genId() {
	return Math.random().toString(36).slice(2);
}

function DragHandle() {
	return (
		<svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" className="text-zinc-600">
			<circle cx="3" cy="3" r="1.5" />
			<circle cx="9" cy="3" r="1.5" />
			<circle cx="3" cy="9" r="1.5" />
			<circle cx="9" cy="9" r="1.5" />
			<circle cx="3" cy="15" r="1.5" />
			<circle cx="9" cy="15" r="1.5" />
		</svg>
	);
}

function SortableEntry({
	entry,
	workoutNames,
	onRemove,
	onChangeWorkout,
	t,
}: {
	entry: SequentialEntry;
	workoutNames: string[];
	onRemove: (id: string) => void;
	onChangeWorkout: (id: string, name: string) => void;
	t: (key: string) => string;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry._id });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.5 : 1,
			}}
			className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3 py-3"
		>
			<button {...listeners} {...attributes} className="text-zinc-600 cursor-grab active:cursor-grabbing touch-none p-1" aria-label="Drag to reorder">
				<DragHandle />
			</button>
			<div className="flex-1">
				{entry.type === 'rest' ? (
					<span className="text-sm text-zinc-400 font-medium">{t('routine.restDay')}</span>
				) : (
					<select
						value={entry.workoutName ?? ''}
						onChange={(e) => onChangeWorkout(entry._id, e.target.value)}
						className="w-full bg-zinc-800 text-white text-sm rounded-lg px-2 py-1.5 border-none outline-none"
					>
						<option value="" disabled>{t('routine.selectWorkout')}</option>
						{workoutNames.map((n) => (
							<option key={n} value={n}>{n}</option>
						))}
					</select>
				)}
			</div>
			<button onClick={() => onRemove(entry._id)} className="text-zinc-500 hover:text-red-400 text-lg leading-none px-1">×</button>
		</div>
	);
}

export default function WorkoutConfigPage() {
	const { user } = useUser();
	const { t } = useLocale();
	const { toast } = useToast();
	const router = useRouter();

	const [routineType, setRoutineType] = useState<'sequential' | 'scheduled'>('sequential');
	const [workoutNames, setWorkoutNames] = useState<string[]>([]);
	const [sequentialEntries, setSequentialEntries] = useState<SequentialEntry[]>([]);
	const [scheduledEntries, setScheduledEntries] = useState<Record<WeekDay, string>>(() => {
		const init: Partial<Record<WeekDay, string>> = {};
		WEEK_DAYS_ORDER.forEach((d) => { init[d] = 'rest'; });
		return init as Record<WeekDay, string>;
	});
	const [loaded, setLoaded] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
	);

	useEffect(() => {
		if (!user) return;
		async function load() {
			const db = await Database.getInstance();
			const [workouts, existingConfig] = await Promise.all([
				new WorkoutRepository(db).getAll(),
				new WorkoutConfigRepository(db).get(user!.username),
			]);
			setWorkoutNames(workouts.map((w) => w.name));

			if (existingConfig) {
				setRoutineType(existingConfig.routineType);
				if (existingConfig.routineType === 'sequential') {
					setSequentialEntries(
						existingConfig.entries.map((e) => ({ ...e, _id: genId() })),
					);
				} else {
					const map: Partial<Record<WeekDay, string>> = {};
					WEEK_DAYS_ORDER.forEach((d) => { map[d] = 'rest'; });
					existingConfig.entries.forEach((e) => {
						if (e.weekDay) {
							map[e.weekDay] = e.type === 'rest' ? 'rest' : (e.workoutName ?? 'rest');
						}
					});
					setScheduledEntries(map as Record<WeekDay, string>);
				}
			}
			setLoaded(true);
		}
		void load();
	}, [user]);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		setSequentialEntries((prev) => {
			const oldIndex = prev.findIndex((e) => e._id === active.id);
			const newIndex = prev.findIndex((e) => e._id === over.id);
			return arrayMove(prev, oldIndex, newIndex);
		});
	}, []);

	function addWorkout() {
		const first = workoutNames[0] ?? '';
		setSequentialEntries((prev) => [...prev, { type: 'workout', workoutName: first, _id: genId() }]);
	}

	function addRest() {
		setSequentialEntries((prev) => [...prev, { type: 'rest', _id: genId() }]);
	}

	function removeEntry(id: string) {
		setSequentialEntries((prev) => prev.filter((e) => e._id !== id));
	}

	function changeWorkout(id: string, name: string) {
		setSequentialEntries((prev) =>
			prev.map((e) => e._id === id ? { ...e, workoutName: name } : e),
		);
	}

	async function handleSave() {
		if (!user) return;

		let entries: RoutineEntry[];

		if (routineType === 'sequential') {
			entries = sequentialEntries.map((e): RoutineEntry =>
				e.type === 'rest'
					? { type: 'rest', ...(e.weekDay ? { weekDay: e.weekDay } : {}) }
					: { type: 'workout', workoutName: e.workoutName ?? '', ...(e.weekDay ? { weekDay: e.weekDay } : {}) },
			);
		} else {
			const allAssigned = WEEK_DAYS_ORDER.every((d) => scheduledEntries[d] !== undefined);
			if (!allAssigned) {
				alert(t('routine.scheduledAllRequired'));
				return;
			}
			entries = WEEK_DAYS_ORDER.map((day) => {
				const value = scheduledEntries[day];
				if (value === 'rest') return { type: 'rest' as const, weekDay: day };
				return { type: 'workout' as const, workoutName: value, weekDay: day };
			});
		}

		const config: WorkoutConfig = {
			username: user.username,
			routineType,
			entries,
			tracking: null,
		};

		const db = await Database.getInstance();
		await new WorkoutConfigRepository(db).upsert(config);
		toast(t('routine.saved'));
		router.push('/');
	}

	if (!loaded) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<p className="text-zinc-500">{t('common.loading')}</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-24">
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center gap-3">
					<button onClick={() => router.back()} className="text-zinc-400 text-2xl leading-none">‹</button>
					<h1 className="text-2xl font-bold">{t('routine.title')}</h1>
				</div>

				{/* Routine type toggle */}
				<div className="flex gap-2">
					{(['sequential', 'scheduled'] as const).map((type) => (
						<button
							key={type}
							onClick={() => setRoutineType(type)}
							className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${routineType === type ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
						>
							{t(`routine.${type}`)}
						</button>
					))}
				</div>

				<p className="text-xs text-zinc-500">{t(`routine.${routineType}Hint`)}</p>

				{routineType === 'sequential' ? (
					<div className="space-y-3">
						{workoutNames.length === 0 ? (
							<p className="text-zinc-500 text-sm">{t('routine.noWorkouts')}</p>
						) : (
							<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
								<SortableContext items={sequentialEntries.map((e) => e._id)} strategy={verticalListSortingStrategy}>
									<div className="space-y-2">
										{sequentialEntries.map((entry) => (
											<SortableEntry
												key={entry._id}
												entry={entry}
												workoutNames={workoutNames}
												onRemove={removeEntry}
												onChangeWorkout={changeWorkout}
												t={t}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
						)}
						<div className="flex gap-2 pt-1">
							<button
								onClick={addWorkout}
								disabled={workoutNames.length === 0}
								className="flex-1 bg-zinc-900 text-zinc-300 text-sm font-semibold py-3 rounded-xl disabled:opacity-40"
							>
								{t('routine.addWorkout')}
							</button>
							<button
								onClick={addRest}
								className="flex-1 bg-zinc-900 text-zinc-300 text-sm font-semibold py-3 rounded-xl"
							>
								{t('routine.addRest')}
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-2">
						{WEEK_DAYS_ORDER.map((day) => (
							<div key={day} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
								<span className="text-sm font-semibold w-28 shrink-0">{t(`weekDayLong.${day}`)}</span>
								<select
									value={scheduledEntries[day]}
									onChange={(e) => setScheduledEntries((prev) => ({ ...prev, [day]: e.target.value }))}
									className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-2 py-1.5 border-none outline-none"
								>
									<option value="rest">{t('routine.restDay')}</option>
									{workoutNames.map((n) => (
										<option key={n} value={n}>{n}</option>
									))}
								</select>
							</div>
						))}
					</div>
				)}

				<button
					onClick={handleSave}
					className="w-full bg-white text-black rounded-xl py-4 font-bold text-base"
				>
					{t('routine.save')}
				</button>
			</div>
		</div>
	);
}
