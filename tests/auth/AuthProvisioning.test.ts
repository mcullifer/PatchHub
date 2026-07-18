import {
	ACCOUNT_DISABLED_ERROR_CODE,
	getInternalUserProvisioningRedirect,
	shouldBypassInternalUserProvisioning
} from '$lib/server/auth/provisioning';
import { describe, expect, it } from 'vitest';

describe('shouldBypassInternalUserProvisioning', () => {
	it('allows auth routes required to finish or recover sign-in', () => {
		expect(shouldBypassInternalUserProvisioning('/auth/callback')).toBe(true);
		expect(shouldBypassInternalUserProvisioning('/auth/error')).toBe(true);
		expect(shouldBypassInternalUserProvisioning('/auth/setup')).toBe(true);
	});
});

describe('getInternalUserProvisioningRedirect', () => {
	it('redirects authenticated users without internal users to setup', () => {
		const response = getInternalUserProvisioningRedirect('missing', 'https://patchhub.test');

		expect(response?.status).toBe(302);
		expect(response?.headers.get('location')).toBe('https://patchhub.test/auth/setup');
	});

	it('redirects soft-deleted internal users to the auth error page', () => {
		const response = getInternalUserProvisioningRedirect('deleted', 'https://patchhub.test');

		expect(response?.status).toBe(302);
		expect(response?.headers.get('location')).toBe(
			`https://patchhub.test/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`
		);
	});

	it('does not redirect active or unauthenticated states', () => {
		expect(getInternalUserProvisioningRedirect('active', 'https://patchhub.test')).toBeNull();
		expect(
			getInternalUserProvisioningRedirect('unauthenticated', 'https://patchhub.test')
		).toBeNull();
	});
});
