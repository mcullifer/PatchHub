import { USERNAME_RULE_MESSAGE, normalizeUsername, validateUsername } from '$convex/lib/usernames';
import { describe, expect, it } from 'vitest';

describe('normalizeUsername', () => {
	it('trims surrounding whitespace and stores usernames lowercase', () => {
		expect(normalizeUsername('  PatchHub42  ')).toBe('patchhub42');
	});
});

describe('validateUsername', () => {
	it('accepts lowercase letters and numbers', () => {
		expect(validateUsername('patchhub42')).toEqual({
			ok: true,
			username: 'patchhub42'
		});
	});

	it('normalizes uppercase input before validation', () => {
		expect(validateUsername('PATCHHUB42')).toEqual({
			ok: true,
			username: 'patchhub42'
		});
	});

	it('rejects punctuation, underscores, and hyphens', () => {
		expect(validateUsername('patch_hub')).toEqual({
			ok: false,
			message: USERNAME_RULE_MESSAGE
		});
		expect(validateUsername('patch-hub')).toEqual({
			ok: false,
			message: USERNAME_RULE_MESSAGE
		});
	});
});
