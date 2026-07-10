import { getAuthContext } from '$lib/server/auth/AuthContext';
import { ACCOUNT_DISABLED_ERROR_CODE } from '$lib/server/auth/provisioning';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { workosUser, dbUser, internalUserStatus } = await getAuthContext(event);

	if (!workosUser) {
		throw redirect(302, `/auth/login?returnTo=${encodeURIComponent(event.url.pathname)}`);
	}

	if (internalUserStatus === 'deleted') {
		throw redirect(302, `/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`);
	}

	if (!dbUser) {
		throw redirect(302, '/auth/setup');
	}

	if (!dbUser.username) {
		throw redirect(302, '/auth/setup');
	}

	return {
		account: {
			username: dbUser.username,
			email: dbUser.email ?? workosUser.email
		}
	};
};
