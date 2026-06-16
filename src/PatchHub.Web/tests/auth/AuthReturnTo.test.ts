import { normalizeReturnTo } from '$lib/server/auth/returnTo';
import { describe, expect, it } from 'vitest';

describe('normalizeReturnTo', () => {
	it('allows app-relative paths', () => {
		expect(normalizeReturnTo('/favorites')).toBe('/favorites');
		expect(normalizeReturnTo('/steam/730?tab=news')).toBe('/steam/730?tab=news');
	});

	it('falls back for missing or external URLs', () => {
		expect(normalizeReturnTo(null)).toBe('/');
		expect(normalizeReturnTo('https://example.com')).toBe('/');
		expect(normalizeReturnTo('//example.com/path')).toBe('/');
	});
});
