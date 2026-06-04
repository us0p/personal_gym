'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import Database from '../../core/infra/database';
import { Workout, WorkoutExercise } from '../../core/entities/workout/workout';
import { WorkoutRepository } from '../../core/entities/workout/workout-repository';
import { useLocale } from '../../context/locale-context';

function SortableExerciseItem({ we, workoutName }: { we: WorkoutExercise; workoutName: string }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: we.name });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.5 : 1,
				boxShadow: isDragging ? '0 4px 20px rgba(0,0,0,0.4)' : undefined,
			}}
			className="flex items-center bg-zinc-900 rounded-2xl overflow-hidden"
		>
			<button
				{...listeners}
				{...attributes}
				className="px-3 py-4 text-zinc-600 cursor-grab active:cursor-grabbing touch-none"
				aria-label="Drag to reorder"
			>
				<svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
					<circle cx="3" cy="3" r="1.5" />
					<circle cx="9" cy="3" r="1.5" />
					<circle cx="3" cy="9" r="1.5" />
					<circle cx="9" cy="9" r="1.5" />
					<circle cx="3" cy="15" r="1.5" />
					<circle cx="9" cy="15" r="1.5" />
				</svg>
			</button>
			<Link
				href={`/workouts/${encodeURIComponent(workoutName)}/${encodeURIComponent(we.name)}`}
				className="flex-1 flex items-center justify-between pr-4 py-4"
			>
				<p className="font-semibold">{we.name}</p>
				<span className="text-zinc-500 text-xl leading-none">›</span>
			</Link>
		</div>
	);
}

export default function WorkoutPage() {
	const params = useParams();
	const router = useRouter();
	const { t } = useLocale();
	const workoutName = decodeURIComponent(params.name as string);
	const [workout, setWorkout] = useState<Workout | null>(null);
	const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
	);

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const repo = new WorkoutRepository(db);
			const found = await repo.get(workoutName);
			setWorkout(found ?? null);
			setExercises(found?.exercises ?? []);
		}
		void load();
	}, [workoutName]);

	async function persist(reordered: WorkoutExercise[]) {
		const db = await Database.getInstance();
		const repo = new WorkoutRepository(db);
		await repo.update({ ...workout!, exercises: reordered });
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = exercises.findIndex((e) => e.name === active.id);
		const newIndex = exercises.findIndex((e) => e.name === over.id);
		const reordered = arrayMove(exercises, oldIndex, newIndex);
		setExercises(reordered);
		void persist(reordered);
	}

	if (!workout) return (
		<div className="min-h-screen bg-black flex items-center justify-center">
			<p className="text-zinc-500">{t('common.loading')}</p>
		</div>
	);

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<button onClick={() => router.push('/workouts')} className="text-zinc-400 text-2xl leading-none">‹</button>
						<div>
							<h1 className="text-2xl font-bold">{workout.name}</h1>
							{workout.weekDays && workout.weekDays.length > 0 && (
								<p className="text-zinc-500 text-sm mt-0.5">
									{workout.weekDays.map((d) => t(`weekDayLong.${d}`)).join(', ')}
								</p>
							)}
						</div>
					</div>
					<Link
						href={`/workouts/${encodeURIComponent(workout.name)}/edit`}
						className="text-sm text-zinc-400 font-medium mt-1"
					>
						{t('common.edit')}
					</Link>
				</div>

				{/* Exercise list */}
				{exercises.length === 0 ? (
					<div className="bg-zinc-900 rounded-2xl p-6 text-center space-y-2">
						<p className="text-zinc-400 text-sm">{t('workoutDetail.noExercises')}</p>
						<Link
							href={`/workouts/${encodeURIComponent(workout.name)}/edit`}
							className="text-white text-sm underline"
						>
							{t('workoutDetail.addExercises')}
						</Link>
					</div>
				) : (
					<div className="space-y-2">
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">{t('workoutDetail.exercises')}</p>
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext items={exercises.map((e) => e.name)} strategy={verticalListSortingStrategy}>
								{exercises.map((we) => (
									<SortableExerciseItem key={we.name} we={we} workoutName={workout.name} />
								))}
							</SortableContext>
						</DndContext>
					</div>
				)}
			</div>
		</div>
	);
}
