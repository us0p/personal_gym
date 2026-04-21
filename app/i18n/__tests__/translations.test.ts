import { describe, it, expect } from 'vitest';
import { LOCALES, translations, detectLocale, interpolate } from '../translations';

describe('translations – key coverage', () => {
	const enKeys = Object.keys(translations['en']).sort();
	const ptKeys = Object.keys(translations['pt-BR']).sort();

	it('both locales define the same set of keys', () => {
		expect(enKeys).toEqual(ptKeys);
	});

	it('all English values are non-empty strings', () => {
		for (const [key, value] of Object.entries(translations['en'])) {
			expect(typeof value, `en.${key} must be a string`).toBe('string');
			expect(value.trim().length, `en.${key} must not be empty`).toBeGreaterThan(0);
		}
	});

	it('all pt-BR values are non-empty strings', () => {
		for (const [key, value] of Object.entries(translations['pt-BR'])) {
			expect(typeof value, `pt-BR.${key} must be a string`).toBe('string');
			expect(value.trim().length, `pt-BR.${key} must not be empty`).toBeGreaterThan(0);
		}
	});
});

describe('LOCALES', () => {
	it('includes en and pt-BR', () => {
		expect(LOCALES).toContain('en');
		expect(LOCALES).toContain('pt-BR');
	});
});

describe('detectLocale()', () => {
	it('returns en for undefined navigator', () => {
		// In node environment navigator is undefined
		expect(detectLocale()).toBe('en');
	});
});

describe('interpolate()', () => {
	it('replaces a single placeholder', () => {
		expect(interpolate('Hey, {username}', { username: 'alice' })).toBe('Hey, alice');
	});

	it('replaces multiple placeholders', () => {
		expect(interpolate('{age} anos, {height} cm', { age: 30, height: 170 })).toBe('30 anos, 170 cm');
	});

	it('leaves unknown placeholders as-is', () => {
		expect(interpolate('{unknown}', {})).toBe('{unknown}');
	});

	it('handles numeric values', () => {
		expect(interpolate('{count} exercícios', { count: 5 })).toBe('5 exercícios');
	});

	it('returns template unchanged when no params', () => {
		expect(interpolate('hello world', {})).toBe('hello world');
	});
});

describe('translations – spot checks en', () => {
	const en = translations['en'];

	it('nav labels are correct', () => {
		expect(en['nav.home']).toBe('Home');
		expect(en['nav.workouts']).toBe('Workouts');
		expect(en['nav.exercises']).toBe('Exercises');
		expect(en['nav.profile']).toBe('Profile');
	});

	it('home greeting uses interpolation placeholder', () => {
		expect(en['home.greeting']).toContain('{username}');
	});

	it('week day translations are present', () => {
		expect(en['weekDay.Mon']).toBe('Mon');
		expect(en['weekDayLong.MONDAY']).toBe('Monday');
	});

	it('body region translations are present', () => {
		expect(en['bodyRegion.Chest']).toBe('Chest');
		expect(en['bodyRegion.Hamstrings']).toBe('Hamstrings');
	});
});

describe('translations – spot checks pt-BR', () => {
	const pt = translations['pt-BR'];

	it('nav labels are translated', () => {
		expect(pt['nav.home']).toBe('Início');
		expect(pt['nav.workouts']).toBe('Treinos');
		expect(pt['nav.exercises']).toBe('Exercícios');
		expect(pt['nav.profile']).toBe('Perfil');
	});

	it('home greeting uses interpolation placeholder', () => {
		expect(pt['home.greeting']).toContain('{username}');
	});

	it('week day translations are correct', () => {
		expect(pt['weekDay.Mon']).toBe('Seg');
		expect(pt['weekDayLong.MONDAY']).toBe('Segunda-feira');
	});

	it('body region translations are correct', () => {
		expect(pt['bodyRegion.Chest']).toBe('Peito');
		expect(pt['bodyRegion.Hamstrings']).toBe('Isquiotibiais');
	});

	it('lang picker uses initials', () => {
		expect(pt['lang.en']).toBe('EN');
		expect(pt['lang.pt-BR']).toBe('PT');
	});
});
