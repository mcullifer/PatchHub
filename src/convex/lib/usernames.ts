// Username and owner-slug rules shared between the Convex backend and the SvelteKit app
// (imported there via the $convex alias). Keep this file free of runtime imports.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9]+$/;
export const OWNER_ROUTE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const USERNAME_RULE_MESSAGE = 'Username can only contain lowercase letters and numbers';
export const RESERVED_USERNAME_MESSAGE = 'This username is reserved';
export const RESERVED_OWNER_SLUGS = [
	'about',
	'auth',
	'demo',
	'privacy',
	'profile',
	'settings',
	'sitemap.xml',
	'software',
	'steam',
	'terms'
] as const;

type ReservedOwnerSlug = (typeof RESERVED_OWNER_SLUGS)[number];

export type UsernameValidationResult =
	| {
			ok: true;
			username: string;
	  }
	| {
			ok: false;
			message: string;
	  };

export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

export function isReservedOwnerSlug(slug: string): boolean {
	return RESERVED_OWNER_SLUGS.includes(normalizeUsername(slug) as ReservedOwnerSlug);
}

export function validateUsername(username: string): UsernameValidationResult {
	const normalizedUsername = normalizeUsername(username);

	if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
		return {
			ok: false,
			message: `Username must be at least ${USERNAME_MIN_LENGTH} characters`
		};
	}

	if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
		return {
			ok: false,
			message: `Username must be at most ${USERNAME_MAX_LENGTH} characters`
		};
	}

	if (!USERNAME_PATTERN.test(normalizedUsername)) {
		return {
			ok: false,
			message: USERNAME_RULE_MESSAGE
		};
	}

	if (isReservedOwnerSlug(normalizedUsername)) {
		return {
			ok: false,
			message: RESERVED_USERNAME_MESSAGE
		};
	}

	return {
		ok: true,
		username: normalizedUsername
	};
}
