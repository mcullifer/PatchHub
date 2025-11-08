import { findUserByAuthProviderId } from '$lib/server/UserService';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	if (!locals.auth.user) {
		throw redirect(302, '/');
	}

	const workosUser = locals.auth.user;

	// Check if user already has an account
	const dbUser = await findUserByAuthProviderId(workosUser.id);
	if (dbUser) {
		// Already set up, redirect to home
		throw redirect(302, '/');
	}

	// Return WorkOS user data for display
	return {
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName
	};
};
