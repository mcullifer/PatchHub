import { match } from '../src/params/owner';
import {
	RESERVED_OWNER_SLUGS,
	RESERVED_USERNAME_MESSAGE,
	validateUsername
} from '../src/convex/lib/usernames';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const staticTopLevelRouteSegments = readdirSync('src/routes', { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.filter((routeSegment) => !routeSegment.startsWith('[') && !routeSegment.startsWith('('));

describe('owner route matcher', () => {
	it('accepts user and organization owner slugs', () => {
		expect(match('user123')).toBe(true);
		expect(match('team42')).toBe(true);
		expect(match('team-alpha')).toBe(true);
	});

	it('rejects reserved app route namespaces', () => {
		for (const reservedSlug of RESERVED_OWNER_SLUGS) {
			expect(match(reservedSlug)).toBe(false);
		}
	});

	it('reserves every static top-level app route from the owner namespace', () => {
		for (const routeSegment of staticTopLevelRouteSegments) {
			expect(RESERVED_OWNER_SLUGS).toContain(routeSegment);
		}
	});

	it('rejects malformed owner route segments', () => {
		expect(match('-team')).toBe(false);
		expect(match('team-')).toBe(false);
		expect(match('team_name')).toBe(false);
	});
});

describe('reserved owner usernames', () => {
	it('rejects usernames that would collide with app routes', () => {
		expect(validateUsername('auth')).toEqual({
			ok: false,
			message: RESERVED_USERNAME_MESSAGE
		});
	});
});
