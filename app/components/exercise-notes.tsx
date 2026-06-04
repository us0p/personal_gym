'use client'

import { useState, useEffect } from 'react';
import Database from '../core/infra/database';
import { ExerciseNoteRepository } from '../core/entities/exercise-note/exercise-note-repository';
import type { ExerciseNote } from '../core/entities/exercise-note/exercise-note';
import { useLocale } from '../context/locale-context';

function formatTimestamp(ts: string): string {
	return new Date(ts).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function ExerciseNotes({
	workoutName,
	exerciseName,
	onClose,
}: {
	workoutName: string;
	exerciseName: string;
	onClose: () => void;
}) {
	const { t } = useLocale();
	const [notes, setNotes] = useState<ExerciseNote[]>([]);
	const [newContent, setNewContent] = useState('');
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editContent, setEditContent] = useState('');

	async function loadNotes() {
		const db = await Database.getInstance();
		const repo = new ExerciseNoteRepository(db);
		setNotes(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
	}

	useEffect(() => {
		async function load() {
			const db = await Database.getInstance();
			const repo = new ExerciseNoteRepository(db);
			setNotes(await repo.getByWorkoutAndExercise(workoutName, exerciseName));
		}
		void load();
	}, [workoutName, exerciseName]);

	async function handleAdd() {
		const content = newContent.trim();
		if (!content) return;
		const db = await Database.getInstance();
		await new ExerciseNoteRepository(db).add({
			workoutName,
			exerciseName,
			content,
			timestamp: new Date().toISOString(),
		});
		setNewContent('');
		await loadNotes();
	}

	async function handleSaveEdit(note: ExerciseNote) {
		const content = editContent.trim();
		if (!content) return;
		const db = await Database.getInstance();
		await new ExerciseNoteRepository(db).update({
			...note,
			content,
			timestamp: new Date().toISOString(),
		});
		setEditingId(null);
		await loadNotes();
	}

	async function handleDelete(id: number) {
		const db = await Database.getInstance();
		await new ExerciseNoteRepository(db).delete(id);
		await loadNotes();
	}

	function startEdit(note: ExerciseNote) {
		setEditingId(note.id!);
		setEditContent(note.content);
	}

	function cancelEdit() {
		setEditingId(null);
		setEditContent('');
	}

	const textareaClass = 'w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-500 text-base resize-none';

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14 pb-8">
			<div className="max-w-lg mx-auto space-y-6">

				{/* Header */}
				<div className="flex items-center gap-3">
					<button onClick={onClose} className="text-zinc-400 text-2xl leading-none">‹</button>
					<div>
						<h1 className="text-2xl font-bold">{t('exerciseNotes.title')}</h1>
						<p className="text-zinc-500 text-sm mt-0.5">{exerciseName} · {workoutName}</p>
					</div>
				</div>

				{/* Add note */}
				<div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
					<textarea
						rows={3}
						value={newContent}
						onChange={(e) => setNewContent(e.target.value)}
						placeholder={t('exerciseNotes.placeholder')}
						className={textareaClass}
					/>
					<button
						onClick={handleAdd}
						disabled={!newContent.trim()}
						className="w-full bg-white text-black rounded-xl px-6 py-3 font-bold text-base disabled:opacity-40"
					>
						{t('exerciseNotes.add')}
					</button>
				</div>

				{/* Notes list */}
				{notes.length === 0 ? (
					<p className="text-zinc-500 text-sm text-center px-1">{t('exerciseNotes.empty')}</p>
				) : (
					<div className="space-y-3">
						{notes.map((note) =>
							editingId === note.id ? (
								<div key={note.id} className="bg-zinc-900 rounded-2xl p-4 space-y-3">
									<textarea
										rows={3}
										value={editContent}
										onChange={(e) => setEditContent(e.target.value)}
										className={textareaClass}
									/>
									<div className="flex gap-2">
										<button
											onClick={() => handleSaveEdit(note)}
											disabled={!editContent.trim()}
											className="flex-1 bg-white text-black rounded-xl py-2.5 font-bold text-sm disabled:opacity-40"
										>
											{t('exerciseNotes.save')}
										</button>
										<button
											onClick={cancelEdit}
											className="flex-1 bg-zinc-800 text-white rounded-xl py-2.5 font-bold text-sm"
										>
											{t('exerciseNotes.cancel')}
										</button>
									</div>
								</div>
							) : (
								<div key={note.id} className="bg-zinc-900 rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
									<div className="min-w-0 space-y-1">
										<p className="text-sm text-white whitespace-pre-wrap">{note.content}</p>
										<p className="text-xs text-zinc-500">{formatTimestamp(note.timestamp)}</p>
									</div>
									<div className="flex gap-3 shrink-0 mt-0.5">
										<button
											onClick={() => startEdit(note)}
											className="text-zinc-400 text-sm font-medium hover:text-white"
										>
											{t('exerciseNotes.edit')}
										</button>
										<button
											onClick={() => handleDelete(note.id!)}
											className="text-red-400 text-sm font-medium"
										>
											✕
										</button>
									</div>
								</div>
							)
						)}
					</div>
				)}
			</div>
		</div>
	);
}
