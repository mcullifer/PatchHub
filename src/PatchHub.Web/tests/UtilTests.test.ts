import { normalizeGameName } from '$lib/util/StringUtils';
import { describe, expect, it } from 'vitest';

describe('UtilTests', () => {
	it('Should remove special characters', () => {
		const counterstrike = 'Counter-Strike: Global Offensive';
		const normalized = normalizeGameName(counterstrike);
		expect(normalized).toBe('COUNTERSTRIKE_GLOBAL_OFFENSIVE');

		const roller_coaster_tycoon = 'RollerCoaster Tycoon® 3: Platinum';
		const normalized2 = normalizeGameName(roller_coaster_tycoon);
		expect(normalized2).toBe('ROLLERCOASTER_TYCOON_3_PLATINUM');

		const mystery = 'Mystery P.I.™ - The Vegas Heist';
		const normalized3 = normalizeGameName(mystery);
		expect(normalized3).toBe('MYSTERY_PI_THE_VEGAS_HEIST');

		const darkforces = 'STAR WARS™ Dark Forces (Classic, 1995)';
		const normalized4 = normalizeGameName(darkforces);
		expect(normalized4).toBe('STAR_WARS_DARK_FORCES_CLASSIC_1995');
	});
});
