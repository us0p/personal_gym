// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Dashboard from '../page';
import { useUser } from '../context/user-context';

vi.mock('../context/user-context', () => ({
	useUser: vi.fn(),
}));

vi.mock('../core/infra/database', () => ({
	default: {
		getInstance: vi.fn().mockResolvedValue({
			getAll: vi.fn().mockResolvedValue([]),
		}),
	},
}));

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement('a', { href }, children),
}));

const mockUseUser = useUser as ReturnType<typeof vi.fn>;

describe('Dashboard', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, currentWeight: undefined, refreshUser: vi.fn() });
	});

	it('shows "Welcome" greeting when no user is selected', () => {
		render(<Dashboard />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome');
	});

	it('shows username greeting when user is set', () => {
		mockUseUser.mockReturnValue({ user: { username: 'alice' }, currentWeight: 70, refreshUser: vi.fn() });
		render(<Dashboard />);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hey, alice');
	});

	it('shows profile prompt link when no user is selected', () => {
		render(<Dashboard />);
		expect(screen.getByText('Select or create a profile')).toBeDefined();
	});

	it('does not show profile prompt when user is set', () => {
		mockUseUser.mockReturnValue({ user: { username: 'alice' }, currentWeight: 70, refreshUser: vi.fn() });
		render(<Dashboard />);
		expect(screen.queryByText('Select or create a profile')).toBeNull();
	});
});
