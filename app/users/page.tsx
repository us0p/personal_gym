'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Database from '../core/infra/database';
import { useUser } from '../context/user-context';
import { useLocale } from '../context/locale-context';
import { useToast } from '../context/toast-context';
import { calculateAge } from './utils';

const DB_STORES = ['users', 'workout', 'exercise', 'execution', 'userWeightProgression'] as const;

const UPSERT_STORES = ['users', 'execution', 'userWeightProgression'] as const;
const APPEND_STORES = ['workout', 'exercise'] as const;

async function importAllData(file: File): Promise<void> {
	const text = await file.text();
	const data = JSON.parse(text);
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error('Invalid format');
	}
	const db = await Database.getInstance();
	for (const store of UPSERT_STORES) {
		const records = data[store];
		if (!Array.isArray(records)) continue;
		for (const record of records) await db.put(store, record);
	}
	for (const store of APPEND_STORES) {
		const records = data[store];
		if (!Array.isArray(records)) continue;
		for (const record of records) {
			const key = (record as Record<string, unknown>).name as string;
			if (!await db.get(store, key)) await db.add(store, record);
		}
	}
}

async function exportAllData(): Promise<object> {
	const db = await Database.getInstance();
	const result: Record<string, unknown[]> = {};
	for (const store of DB_STORES) {
		result[store] = await db.getAll(store);
	}
	return result;
}

function downloadJson(data: object, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function ExportModal({ onClose }: { onClose: () => void }) {
	const { t } = useLocale();
	const [data, setData] = useState<object | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		exportAllData().then(setData);
	}, []);

	useEffect(() => {
		dialogRef.current?.showModal();
	}, []);

	function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
		if (e.target === dialogRef.current) onClose();
	}

	return (
		<dialog
			ref={dialogRef}
			onClick={handleBackdropClick}
			className="m-0 p-0 w-full h-full max-w-full max-h-full bg-transparent backdrop:bg-black/70"
		>
			<div className="flex flex-col h-full max-w-lg mx-auto bg-zinc-950 text-white">
				<div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0">
					<h2 className="text-base font-bold">{t('profile.dbExport')}</h2>
					<button onClick={onClose} className="text-zinc-400 text-2xl leading-none">×</button>
				</div>

				<div className="flex-1 overflow-y-auto px-4 py-4">
					{data === null ? (
						<p className="text-zinc-500 text-sm">{t('profile.exportLoading')}</p>
					) : (
						<pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all font-mono leading-relaxed">
							{JSON.stringify(data, null, 2)}
						</pre>
					)}
				</div>

				<div className="px-4 py-4 border-t border-zinc-800 shrink-0">
					<button
						disabled={data === null}
						onClick={() => data && downloadJson(data, 'gym.json')}
						className="w-full bg-white text-black rounded-xl py-4 font-bold text-base disabled:opacity-40"
					>
						{t('profile.export')}
					</button>
				</div>
			</div>
		</dialog>
	);
}

export default function ProfilePage() {
	const { user, currentWeight, refreshUser } = useUser();
	const { t } = useLocale();
	const { toast } = useToast();
	const [showExport, setShowExport] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = '';
		try {
			await importAllData(file);
			await refreshUser();
			toast(t('profile.importSuccess'));
		} catch {
			toast(t('profile.importError'));
		}
	}

	if (!user) {
		return (
			<div className="min-h-screen bg-black text-white px-4 pt-14">
				<div className="max-w-lg mx-auto space-y-6">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">{t('profile.title')}</h1>
						<div className="flex items-center gap-3">
							<input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
							<button onClick={() => fileInputRef.current?.click()} className="text-zinc-400 text-sm font-medium">{t('profile.import')}</button>
						</div>
					</div>
					<p className="text-zinc-500 text-center py-12">{t('profile.noProfile')}</p>
					<Link
						href="/users/new"
						className="block w-full bg-white text-black rounded-xl py-4 font-bold text-base text-center"
					>
						{t('profile.createProfile')}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			{showExport && <ExportModal onClose={() => setShowExport(false)} />}
			<div className="max-w-lg mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">{t('profile.title')}</h1>
					<div className="flex items-center gap-3">
						<input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
						<button onClick={() => fileInputRef.current?.click()} className="text-zinc-400 text-sm font-medium">{t('profile.import')}</button>
						<button onClick={() => setShowExport(true)} className="text-zinc-400 text-sm font-medium">{t('profile.export')}</button>
					</div>
				</div>

				<div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-700 space-y-3">
					<div>
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('profile.username')}</p>
						<p className="text-lg font-bold mt-0.5">{user.username}</p>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('profile.age')}</p>
							<p className="text-white font-medium mt-0.5">
								{calculateAge(user.birthDate) !== undefined
									? t('profile.ageValue', { age: calculateAge(user.birthDate)! })
									: '—'}
							</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('profile.sex')}</p>
							<p className="text-white font-medium mt-0.5">
								{user.sex === 'MALE' ? t('common.male') : t('common.female')}
							</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('profile.height')}</p>
							<p className="text-white font-medium mt-0.5">{t('profile.heightValue', { height: user.height })}</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{t('profile.weight')}</p>
							<p className="text-white font-medium mt-0.5">
								{currentWeight !== undefined ? t('profile.weightValue', { weight: currentWeight }) : '—'}
							</p>
						</div>
					</div>
				</div>

				<Link
					href={`/users/${encodeURIComponent(user.username)}`}
					className="block w-full bg-zinc-800 text-white rounded-xl py-4 font-bold text-base text-center"
				>
					{t('profile.editProfile')}
				</Link>
			</div>
		</div>
	);
}
