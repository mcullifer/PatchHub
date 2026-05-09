import { createSlug, getSearchTokens, normalizeName, normalizeSearchName } from '$lib/util/StringUtils';
import { describe, expect, it } from 'vitest';

describe('UtilTests', () => {
	it('Should remove special characters', () => {
		const counterstrike = 'Counter-Strike: Global Offensive';
		const normalized = normalizeName(counterstrike);
		expect(normalized).toBe('COUNTERSTRIKE_GLOBAL_OFFENSIVE');

		const roller_coaster_tycoon = 'RollerCoaster Tycoon® 3: Platinum';
		const normalized2 = normalizeName(roller_coaster_tycoon);
		expect(normalized2).toBe('ROLLERCOASTER_TYCOON_3_PLATINUM');

		const mystery = 'Mystery P.I.™ - The Vegas Heist';
		const normalized3 = normalizeName(mystery);
		expect(normalized3).toBe('MYSTERY_PI_THE_VEGAS_HEIST');

		const darkforces = 'STAR WARS™ Dark Forces (Classic, 1995)';
		const normalized4 = normalizeName(darkforces);
		expect(normalized4).toBe('STAR_WARS_DARK_FORCES_CLASSIC_1995');
	});

	it('creates Unicode-safe search names', () => {
		expect(normalizeSearchName('東方地霊殿 〜 Subterranean Animism.')).toBe(
			'東方地霊殿 subterranean animism'
		);
		expect(normalizeSearchName('炽焰帝国:十字军东征')).toBe('炽焰帝国 十字军东征');
		expect(normalizeSearchName('STAR WARS™ Dark Forces (Classic, 1995)')).toBe(
			'star wars dark forces classic 1995'
		);
	});

	it('creates distinct search tokens from user input', () => {
		expect(getSearchTokens('  STAR   WARS™ star Dark-Forces ')).toEqual([
			'star',
			'wars',
			'dark',
			'forces'
		]);
	});

	it('creates slugs with non-Latin fallback support', () => {
		expect(createSlug('Counter-Strike: Global Offensive', '730')).toBe(
			'counter-strike-global-offensive'
		);
		expect(createSlug('東方地霊殿 〜 Subterranean Animism.', '1100150')).toBe(
			'東方地霊殿-subterranean-animism'
		);
	});
});
