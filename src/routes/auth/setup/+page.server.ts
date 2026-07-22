import { getAuthContext } from '$lib/server/auth/authContext';
import { ACCOUNT_DISABLED_ERROR_CODE } from '$lib/server/auth/provisioning';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { workosUser, user, status } = await getAuthContext(event);
	if (!workosUser) {
		throw redirect(302, '/');
	}

	if (status === 'deleted') {
		throw redirect(302, `/auth/error?code=${ACCOUNT_DISABLED_ERROR_CODE}`);
	}

	if (user) {
		throw redirect(302, '/');
	}

	return {
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName
	};
};
