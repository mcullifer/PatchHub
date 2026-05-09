import { findUserByAuthProviderId } from '$lib/server/UserService';
import { authKit } from '@workos/authkit-sveltekit';
import type { LayoutServerLoad } from './$types';

type LayoutUser = {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	profilePictureUrl: string | null;
	username: string | null;
};

export const load: LayoutServerLoad = async (event) => {
	const workosUser = await authKit.getUser(event);
	if (!workosUser) {
		return { user: null };
	}

	const internalUser = await findUserByAuthProviderId(workosUser.id);
	const user: LayoutUser = {
		id: workosUser.id,
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName,
		profilePictureUrl: workosUser.profilePictureUrl,
		username: internalUser?.username ?? null
	};

	return { user };
};
