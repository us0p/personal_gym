// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { LocaleProvider, useLocale } from '../locale-context';

// ── mocks ────────────────────────────────────────────────────────────────────

vi.mock('../user-context', () => ({
	useUser: vi.fn(() => ({ user: null, refreshUser: vi.fn() })),
}));

vi.mock('../../core/infra/database', () => ({
	default: {
		getInstance: vi.fn().mockResolvedValue({
			getAll: vi.fn().mockResolvedValue([]),
		}),
	},
}));

vi.mock('../../core/entities/user/user-repository', () => ({
	UserRepository: vi.fn().mockImplementation(() => ({
		get: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
	})),
}));

import { useUser } from '../user-context';
import { UserRepository } from '../../core/entities/user/user-repository';

const mockUseUser = useUser as ReturnType<typeof vi.fn>;

// ── helpers ──────────────────────────────────────────────────────────────────

function TestConsumer() {
	const { locale, t } = useLocale();
	return <div data-testid="output">{locale}:{t('nav.home')}</div>;
}

function TestSwitcher() {
	const { locale, setLocale, t } = useLocale();
	return (
		<div>
			<span data-testid="locale">{locale}</span>
			<span data-testid="home">{t('nav.home')}</span>
			<span data-testid="greeting">{t('home.greeting', { username: 'alice' })}</span>
			<button data-testid="switch-to-pt" onClick={() => setLocale('pt-BR')}>pt</button>
			<button data-testid="switch-to-en" onClick={() => setLocale('en')}>en</button>
		</div>
	);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('LocaleProvider – default locale', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, refreshUser: vi.fn() });
	});

	it('renders children', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestConsumer />
				</LocaleProvider>,
			);
		});
		expect(screen.getByTestId('output')).toBeTruthy();
	});

	it('defaults to en in node environment (no navigator.language)', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestConsumer />
				</LocaleProvider>,
			);
		});
		// In node there's no navigator, so detectLocale returns 'en'
		expect(screen.getByTestId('output').textContent).toContain('en:Home');
	});
});

describe('LocaleProvider – applies stored user locale', () => {
	it('uses locale from user.locale when user has one', async () => {
		mockUseUser.mockReturnValue({
			user: { username: 'alice', locale: 'pt-BR' },
			refreshUser: vi.fn(),
		});

		await act(async () => {
			render(
				<LocaleProvider>
					<TestConsumer />
				</LocaleProvider>,
			);
		});

		expect(screen.getByTestId('output').textContent).toContain('pt-BR:Início');
	});

	it('ignores invalid locale values from user record', async () => {
		mockUseUser.mockReturnValue({
			user: { username: 'alice', locale: 'invalid-locale' },
			refreshUser: vi.fn(),
		});

		await act(async () => {
			render(
				<LocaleProvider>
					<TestConsumer />
				</LocaleProvider>,
			);
		});

		// Falls back to browser-detected (en in node)
		expect(screen.getByTestId('output').textContent).toContain('en:Home');
	});
});

describe('LocaleProvider – setLocale', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, refreshUser: vi.fn() });
	});

	it('switches locale and updates translations', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestSwitcher />
				</LocaleProvider>,
			);
		});

		expect(screen.getByTestId('locale').textContent).toBe('en');
		expect(screen.getByTestId('home').textContent).toBe('Home');

		await act(async () => {
			fireEvent.click(screen.getByTestId('switch-to-pt'));
		});

		expect(screen.getByTestId('locale').textContent).toBe('pt-BR');
		expect(screen.getByTestId('home').textContent).toBe('Início');
	});

	it('can switch back to English', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestSwitcher />
				</LocaleProvider>,
			);
		});

		await act(async () => { fireEvent.click(screen.getByTestId('switch-to-pt')); });
		await act(async () => { fireEvent.click(screen.getByTestId('switch-to-en')); });

		expect(screen.getByTestId('locale').textContent).toBe('en');
		expect(screen.getByTestId('home').textContent).toBe('Home');
	});
});

describe('LocaleProvider – saves locale to user record', () => {
	it('calls repo.update with new locale when user exists', async () => {
		const mockUpdate = vi.fn().mockResolvedValue(undefined);
		const mockGet = vi.fn().mockResolvedValue({ username: 'alice', sex: 'FEMALE', birthDate: new Date(), height: 165 });
		const MockRepo = vi.fn().mockImplementation(() => ({ get: mockGet, update: mockUpdate }));
		(UserRepository as ReturnType<typeof vi.fn>).mockImplementation(MockRepo);

		const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
		mockUseUser.mockReturnValue({
			user: { username: 'alice', sex: 'FEMALE', birthDate: new Date(), height: 165 },
			refreshUser: mockRefreshUser,
		});

		await act(async () => {
			render(
				<LocaleProvider>
					<TestSwitcher />
				</LocaleProvider>,
			);
		});

		await act(async () => {
			fireEvent.click(screen.getByTestId('switch-to-pt'));
		});

		// Give async operations time to complete
		await act(async () => { await Promise.resolve(); });

		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ locale: 'pt-BR' }),
		);
		expect(mockRefreshUser).toHaveBeenCalled();
	});
});

describe('LocaleProvider – t() interpolation', () => {
	beforeEach(() => {
		mockUseUser.mockReturnValue({ user: null, refreshUser: vi.fn() });
	});

	it('interpolates username in greeting', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestSwitcher />
				</LocaleProvider>,
			);
		});

		expect(screen.getByTestId('greeting').textContent).toBe('Hey, alice');
	});

	it('interpolates greeting in pt-BR', async () => {
		await act(async () => {
			render(
				<LocaleProvider>
					<TestSwitcher />
				</LocaleProvider>,
			);
		});

		await act(async () => { fireEvent.click(screen.getByTestId('switch-to-pt')); });

		expect(screen.getByTestId('greeting').textContent).toBe('Olá, alice');
	});

	it('returns key as fallback for unknown translation key', async () => {
		function TestFallback() {
			const { t } = useLocale();
			return <span data-testid="fallback">{t('does.not.exist')}</span>;
		}

		await act(async () => {
			render(
				<LocaleProvider>
					<TestFallback />
				</LocaleProvider>,
			);
		});

		expect(screen.getByTestId('fallback').textContent).toBe('does.not.exist');
	});
});
