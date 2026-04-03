import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toDateInputValue, calculateAge } from '../utils';

// ─── toDateInputValue() ───────────────────────────────────────────────────────

describe('toDateInputValue()', () => {
	it('returns an empty string for null', () => {
		expect(toDateInputValue(null)).toBe('');
	});

	it('returns an empty string for undefined', () => {
		expect(toDateInputValue(undefined)).toBe('');
	});

	it('formats a Date as yyyy-mm-dd', () => {
		expect(toDateInputValue(new Date('2000-06-15T00:00:00.000Z'))).toBe('2000-06-15');
	});

	it('zero-pads month and day', () => {
		expect(toDateInputValue(new Date('1990-01-05T00:00:00.000Z'))).toBe('1990-01-05');
	});
});

// ─── calculateAge() ──────────────────────────────────────────────────────────

describe('calculateAge()', () => {
	beforeEach(() => {
		// Pin "today" to 2026-04-03
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns undefined for null', () => {
		expect(calculateAge(null)).toBeUndefined();
	});

	it('returns undefined for undefined', () => {
		expect(calculateAge(undefined)).toBeUndefined();
	});

	it('returns the correct age when birthday has already passed this year', () => {
		// born 1990-01-15 → turned 36 on Jan 15 2026
		expect(calculateAge(new Date('1990-01-15'))).toBe(36);
	});

	it('returns the correct age on the exact birthday', () => {
		// born 1990-04-03 → turns 36 today
		expect(calculateAge(new Date('1990-04-03'))).toBe(36);
	});

	it('has not yet incremented when birthday is later this year', () => {
		// born 1990-12-01 → still 35 until Dec 1 2026
		expect(calculateAge(new Date('1990-12-01'))).toBe(35);
	});

	it('handles a birth date in a leap year', () => {
		// born 1996-02-29 → today is Apr 3 2026, birthday (Mar 1 in non-leap) already passed
		expect(calculateAge(new Date('1996-02-29'))).toBe(30);
	});
});
