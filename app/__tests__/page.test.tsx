// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

	it('shows "Welcome" greeting when no user is selected', async () => {
		await act(async () => { render(<Dashboard />); });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome');
	});

	it('shows username greeting when user is set', async () => {
		mockUseUser.mockReturnValue({ user: { username: 'alice' }, currentWeight: 70, refreshUser: vi.fn() });
		await act(async () => { render(<Dashboard />); });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hey, alice');
	});
});
