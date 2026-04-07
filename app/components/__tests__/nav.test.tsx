// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import Nav from '../nav';

// ── mocks ────────────────────────────────────────────────────────────────────

const { mockUsePathname } = vi.hoisted(() => ({
	mockUsePathname: vi.fn().mockReturnValue('/'),
}));

vi.mock('next/navigation', () => ({
	usePathname: mockUsePathname,
}));

vi.mock('next/link', () => ({
	default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
		React.createElement('a', { href, className }, children),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function workoutsLink(): HTMLAnchorElement {
	return screen.getByText('Workouts').closest('a') as HTMLAnchorElement;
}

function activeTabLabel(): string {
	return Array.from(document.querySelectorAll('nav span'))
		.find((el) => el.className.includes('text-white'))
		?.textContent ?? '';
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('Nav – Workouts tab href', () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockUsePathname.mockReturnValue('/');
	});

	it('defaults to /workouts when sessionStorage is empty', async () => {
		await act(async () => { render(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts');
	});

	it('hydrates href from sessionStorage on mount', async () => {
		sessionStorage.setItem('lastWorkoutsPath', '/workouts/Push Day/Dips');

		await act(async () => { render(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day/Dips');
	});

	it('updates href when the user navigates to a workout list path', async () => {
		const { rerender } = render(<Nav />);

		mockUsePathname.mockReturnValue('/workouts');
		await act(async () => { rerender(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts');
	});

	it('updates href when the user navigates to a workout detail path', async () => {
		const { rerender } = render(<Nav />);

		mockUsePathname.mockReturnValue('/workouts/Push Day');
		await act(async () => { rerender(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day');
	});

	it('updates href when the user navigates to an exercise path', async () => {
		const { rerender } = render(<Nav />);

		mockUsePathname.mockReturnValue('/workouts/Push Day/Dips');
		await act(async () => { rerender(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day/Dips');
	});

	it('persists the last workouts path to sessionStorage', async () => {
		const { rerender } = render(<Nav />);

		mockUsePathname.mockReturnValue('/workouts/Push Day/Dips');
		await act(async () => { rerender(<Nav />); });

		expect(sessionStorage.getItem('lastWorkoutsPath')).toBe('/workouts/Push Day/Dips');
	});

	it('preserves last workouts path when navigating away to Home', async () => {
		mockUsePathname.mockReturnValue('/workouts/Push Day/Dips');
		const { rerender } = render(<Nav />);
		await act(async () => {});

		mockUsePathname.mockReturnValue('/');
		await act(async () => { rerender(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day/Dips');
	});

	it('preserves last workouts path when navigating away to Exercises', async () => {
		mockUsePathname.mockReturnValue('/workouts/Push Day');
		const { rerender } = render(<Nav />);
		await act(async () => {});

		mockUsePathname.mockReturnValue('/exercises');
		await act(async () => { rerender(<Nav />); });

		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day');
	});

	it('reflects back navigation: going from exercise to workout detail updates the href', async () => {
		// Start at the exercise page
		mockUsePathname.mockReturnValue('/workouts/Push Day/Dips');
		const { rerender } = render(<Nav />);
		await act(async () => {});

		// Press back — now on the workout detail page
		mockUsePathname.mockReturnValue('/workouts/Push Day');
		await act(async () => { rerender(<Nav />); });

		// Navigate away
		mockUsePathname.mockReturnValue('/');
		await act(async () => { rerender(<Nav />); });

		// Should restore workout detail, not the exercise
		expect(workoutsLink().getAttribute('href')).toBe('/workouts/Push Day');
	});

	it('reflects back navigation: going from workout detail to workouts list updates the href', async () => {
		// Start at workout detail
		mockUsePathname.mockReturnValue('/workouts/Push Day');
		const { rerender } = render(<Nav />);
		await act(async () => {});

		// Press back — now on the workouts list
		mockUsePathname.mockReturnValue('/workouts');
		await act(async () => { rerender(<Nav />); });

		// Navigate away
		mockUsePathname.mockReturnValue('/');
		await act(async () => { rerender(<Nav />); });

		// Should restore the workouts list
		expect(workoutsLink().getAttribute('href')).toBe('/workouts');
	});
});

describe('Nav – active tab highlight', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	const cases: [string, string][] = [
		['/', 'Home'],
		['/workouts', 'Workouts'],
		['/workouts/Push Day', 'Workouts'],
		['/workouts/Push Day/Dips', 'Workouts'],
		['/exercises', 'Exercises'],
		['/exercises/new', 'Exercises'],
		['/users', 'Profile'],
		['/users/alice', 'Profile'],
	];

	it.each(cases)('pathname "%s" highlights the %s tab', async (pathname, expectedTab) => {
		mockUsePathname.mockReturnValue(pathname);
		await act(async () => { render(<Nav />); });

		expect(activeTabLabel()).toBe(expectedTab);
	});
});
