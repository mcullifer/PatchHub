import { getAuthContext } from '$lib/server/auth/authContext';
import { ACCOUNT_DISABLED_ERROR_CODE } from '$lib/server/auth/provisioning';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { workosUser, user, status } = await getAuthContext(event);

	if (!workosUser) {
		throw redirect(302, `/auth/login?returnTo=${encodeURIComponent(event.url.pathname)}`);
	}

	if (status === 'deleted') {
		throw redirect(302, `/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`);
	}

	if (!user) {
		throw redirect(302, '/auth/setup');
	}

	if (!user.username) {
		throw redirect(302, '/auth/setup');
	}

	return {
		account: {
			username: user.username,
			email: user.email ?? workosUser.email
		}
	};
};
