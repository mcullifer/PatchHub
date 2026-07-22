import type { AccountStatus } from './authContext';

export const ACCOUNT_DISABLED_ERROR_CODE = 'account_disabled';

const provisioningBypassPathPrefixes = [
	'/auth/callback',
	'/auth/error',
	'/auth/login',
	'/auth/logout',
	'/auth/setup'
];

export function shouldBypassAccountProvisioning(pathname: string): boolean {
	return provisioningBypassPathPrefixes.some((path) => pathname.startsWith(path));
}

export function getAccountProvisioningRedirect(
	status: AccountStatus,
	origin: string
): Response | null {
	if (status === 'missing') {
		return Response.redirect(new URL('/auth/setup', origin), 302);
	}

	if (status === 'deleted') {
		return Response.redirect(
			new URL(`/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`, origin),
			302
		);
	}

	return null;
}
