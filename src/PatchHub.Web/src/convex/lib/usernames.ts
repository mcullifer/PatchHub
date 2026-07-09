// Username rules shared between the Convex backend and the SvelteKit app
// (imported there via the $convex alias). Keep this file free of runtime imports.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9]+$/;
export const USERNAME_RULE_MESSAGE = 'Username can only contain lowercase letters and numbers';

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

	return {
		ok: true,
		username: normalizedUsername
	};
}
