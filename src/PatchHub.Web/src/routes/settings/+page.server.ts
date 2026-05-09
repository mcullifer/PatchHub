import { getAuthContext } from '$lib/server/auth/AuthContext';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { workosUser, dbUser } = await getAuthContext(event);

	if (!workosUser) {
		throw redirect(302, `/auth/login?returnTo=${encodeURIComponent(event.url.pathname)}`);
	}

	if (!dbUser) {
		throw redirect(302, '/auth/setup');
	}

	return {
		account: {
			username: dbUser.username,
			email: dbUser.email ?? workosUser.email
		}
	};
};
