'use client'

import Link from 'next/link';
import { useUser } from '../context/user-context';
import { calculateAge } from './utils';

export default function ProfilePage() {
	const { user, currentWeight } = useUser();

	if (!user) {
		return (
			<div className="min-h-screen bg-black text-white px-4 pt-14">
				<div className="max-w-lg mx-auto space-y-6">
					<h1 className="text-2xl font-bold">Profile</h1>
					<p className="text-zinc-500 text-center py-12">No profile yet.</p>
					<Link
						href="/users/new"
						className="block w-full bg-white text-black rounded-xl py-4 font-bold text-base text-center"
					>
						Create Profile
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white px-4 pt-14">
			<div className="max-w-lg mx-auto space-y-6">
				<h1 className="text-2xl font-bold">Profile</h1>

				<div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-700 space-y-3">
					<div>
						<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Username</p>
						<p className="text-lg font-bold mt-0.5">{user.username}</p>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Age</p>
							<p className="text-white font-medium mt-0.5">
								{calculateAge(user.birthDate) !== undefined ? `${calculateAge(user.birthDate)} years` : '—'}
							</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Sex</p>
							<p className="text-white font-medium mt-0.5">{user.sex === 'MALE' ? 'Male' : 'Female'}</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Height</p>
							<p className="text-white font-medium mt-0.5">{user.height} cm</p>
						</div>
						<div>
							<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Weight</p>
							<p className="text-white font-medium mt-0.5">
								{currentWeight !== undefined ? `${currentWeight} kg` : '—'}
							</p>
						</div>
					</div>
				</div>

				<Link
					href={`/users/${encodeURIComponent(user.username)}`}
					className="block w-full bg-zinc-800 text-white rounded-xl py-4 font-bold text-base text-center"
				>
					Edit Profile
				</Link>
			</div>
		</div>
	);
}
