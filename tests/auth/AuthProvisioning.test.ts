import {
	ACCOUNT_DISABLED_ERROR_CODE,
	getAccountProvisioningRedirect,
	shouldBypassAccountProvisioning
} from '$lib/server/auth/provisioning';
import { describe, expect, it } from 'vitest';

describe('shouldBypassAccountProvisioning', () => {
	it('allows auth routes required to finish or recover sign-in', () => {
		expect(shouldBypassAccountProvisioning('/auth/callback')).toBe(true);
		expect(shouldBypassAccountProvisioning('/auth/error')).toBe(true);
		expect(shouldBypassAccountProvisioning('/auth/setup')).toBe(true);
	});
});

describe('getAccountProvisioningRedirect', () => {
	it('redirects authenticated users without accounts to setup', () => {
		const response = getAccountProvisioningRedirect('missing', 'https://patchhub.test');

		expect(response?.status).toBe(302);
		expect(response?.headers.get('location')).toBe('https://patchhub.test/auth/setup');
	});

	it('redirects disabled accounts to the auth error page', () => {
		const response = getAccountProvisioningRedirect('deleted', 'https://patchhub.test');

		expect(response?.status).toBe(302);
		expect(response?.headers.get('location')).toBe(
			`https://patchhub.test/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`
		);
	});

	it('does not redirect active or unauthenticated states', () => {
		expect(getAccountProvisioningRedirect('active', 'https://patchhub.test')).toBeNull();
		expect(getAccountProvisioningRedirect('unauthenticated', 'https://patchhub.test')).toBeNull();
	});
});
