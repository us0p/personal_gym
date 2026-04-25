// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import Dashboard from '../page';
import { useUser } from '../context/user-context';
import { useLocale } from '../context/locale-context';

vi.mock('../context/user-context', () => ({
	useUser: vi.fn(),
}));

vi.mock('../context/locale-context', () => ({
	useLocale: vi.fn(),
	LOCALES: ['en', 'pt-BR'],
}));

vi.mock('../core/infra/database', () => ({
	default: {
		getInstance: vi.fn().mockResolvedValue({
			get: vi.fn().mockResolvedValue(undefined),
			getAll: vi.fn().mockResolvedValue([]),
		}),
	},
}));

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) =>
		React.createElement('a', { href }, children),
}));

const mockUseUser = useUser as ReturnType<typeof vi.fn>;
const mockUseLocale = useLocale as ReturnType<typeof vi.fn>;

function makeLocale(locale: 'en' | 'pt-BR', setLocale = vi.fn()) {
	const dict: Record<string, string> = {
		'app.name': 'Personal Gym',
		'home.welcome': 'Welcome',
		'home.greeting': 'Hey, {username}',
		'lang.label': 'Language',
		'lang.en': 'EN',
		'lang.pt-BR': 'PT',
	};
	return {
		locale,
		setLocale,
		t: (key: string, params?: Record<string, string | number>) => {
			let value = dict[key] ?? key;
			if (params) {
				value = value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
			}
			return value;
		},
	};
}

describe('Dashboard – greetings', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, currentWeight: undefined, refreshUser: vi.fn() });
		mockUseLocale.mockReturnValue(makeLocale('en'));
	});

	it('shows "Welcome" when no user is logged in', async () => {
		await act(async () => { render(<Dashboard />); });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome');
	});

	it('shows username greeting when user is set', async () => {
		mockUseUser.mockReturnValue({ user: { username: 'alice' }, currentWeight: 70, refreshUser: vi.fn() });
		await act(async () => { render(<Dashboard />); });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hey, alice');
	});

	it('shows "Personal Gym" app name label', async () => {
		await act(async () => { render(<Dashboard />); });
		expect(screen.getByText('Personal Gym')).toBeTruthy();
	});
});

describe('Dashboard – language picker button', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, currentWeight: undefined, refreshUser: vi.fn() });
	});

	it('renders the picker button with current language name', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		const btn = screen.getByTestId('lang-picker-button');
		expect(btn).toBeTruthy();
		expect(btn.textContent).toContain('EN');
	});

	it('shows PT when locale is pt-BR', async () => {
		mockUseLocale.mockReturnValue(makeLocale('pt-BR'));
		await act(async () => { render(<Dashboard />); });

		expect(screen.getByTestId('lang-picker-button').textContent).toContain('PT');
	});

	it('has accessible aria-label', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		expect(screen.getByTestId('lang-picker-button').getAttribute('aria-label')).toBe('Language');
	});

	it('dropdown is closed initially', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		expect(screen.queryByTestId('lang-option-en')).toBeNull();
		expect(screen.queryByTestId('lang-option-pt-BR')).toBeNull();
	});
});

describe('Dashboard – language dropdown', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, currentWeight: undefined, refreshUser: vi.fn() });
	});

	it('opens dropdown when button is clicked', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		await act(async () => {
			fireEvent.click(screen.getByTestId('lang-picker-button'));
		});

		expect(screen.getByTestId('lang-option-en')).toBeTruthy();
		expect(screen.getByTestId('lang-option-pt-BR')).toBeTruthy();
	});

	it('shows all available language options in the dropdown', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });

		expect(screen.getByTestId('lang-option-en').textContent).toBe('EN');
		expect(screen.getByTestId('lang-option-pt-BR').textContent).toBe('PT');
	});

	it('marks the active locale as selected', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });

		expect(screen.getByTestId('lang-option-en').getAttribute('aria-selected')).toBe('true');
		expect(screen.getByTestId('lang-option-pt-BR').getAttribute('aria-selected')).toBe('false');
	});

	it('calls setLocale with selected locale when an option is clicked', async () => {
		const mockSetLocale = vi.fn().mockResolvedValue(undefined);
		mockUseLocale.mockReturnValue(makeLocale('en', mockSetLocale));

		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });
		await act(async () => { fireEvent.click(screen.getByTestId('lang-option-pt-BR')); });

		expect(mockSetLocale).toHaveBeenCalledWith('pt-BR');
	});

	it('closes dropdown after selecting a language', async () => {
		const mockSetLocale = vi.fn().mockResolvedValue(undefined);
		mockUseLocale.mockReturnValue(makeLocale('en', mockSetLocale));

		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });
		await act(async () => { fireEvent.click(screen.getByTestId('lang-option-pt-BR')); });

		expect(screen.queryByTestId('lang-option-en')).toBeNull();
	});

	it('toggles dropdown closed when button is clicked again', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });
		expect(screen.getByTestId('lang-option-en')).toBeTruthy();

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });
		expect(screen.queryByTestId('lang-option-en')).toBeNull();
	});

	it('closes dropdown when clicking outside', async () => {
		mockUseLocale.mockReturnValue(makeLocale('en'));
		await act(async () => { render(<Dashboard />); });

		await act(async () => { fireEvent.click(screen.getByTestId('lang-picker-button')); });
		expect(screen.getByTestId('lang-option-en')).toBeTruthy();

		await act(async () => {
			fireEvent.mouseDown(document.body);
		});
		expect(screen.queryByTestId('lang-option-en')).toBeNull();
	});
});
