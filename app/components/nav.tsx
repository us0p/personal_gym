'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
	return (
		<svg className={`w-6 h-6 ${active ? 'text-white' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="currentColor">
			<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
		</svg>
	);
}

function DumbbellIcon({ active }: { active: boolean }) {
	return (
		<svg className={`w-6 h-6 ${active ? 'text-white' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
			<rect x="4.5" y="9" width="2" height="6" rx="1" fill="currentColor" stroke="none" />
			<rect x="17.5" y="9" width="2" height="6" rx="1" fill="currentColor" stroke="none" />
			<rect x="2" y="10.5" width="2.5" height="3" rx="1" fill="currentColor" stroke="none" />
			<rect x="19.5" y="10.5" width="2.5" height="3" rx="1" fill="currentColor" stroke="none" />
			<line x1="6.5" y1="12" x2="17.5" y2="12" strokeWidth={2.5} />
		</svg>
	);
}


function BoltIcon({ active }: { active: boolean }) {
	return (
		<svg className={`w-6 h-6 ${active ? 'text-white' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="currentColor">
			<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
		</svg>
	);
}

function PersonIcon({ active }: { active: boolean }) {
	return (
		<svg className={`w-6 h-6 ${active ? 'text-white' : 'text-zinc-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
			<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	);
}

const tabs = [
	{ href: '/', label: 'Home', Icon: HomeIcon, exact: true },
	{ href: '/workouts', label: 'Workouts', Icon: DumbbellIcon, exact: false },
	{ href: '/exercises', label: 'Exercises', Icon: BoltIcon, exact: false },
	{ href: '/users', label: 'Profile', Icon: PersonIcon, exact: false },
];

export default function Nav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
			<div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
				{tabs.map(({ href, label, Icon, exact }) => {
					const active = exact ? pathname === href : pathname.startsWith(href);
					return (
						<Link
							key={href}
							href={href}
							className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
						>
							<Icon active={active} />
							<span className={`text-[10px] font-medium tracking-wide ${active ? 'text-white' : 'text-zinc-500'}`}>
								{label}
							</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
