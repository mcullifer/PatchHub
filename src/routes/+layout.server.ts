import { getAuthContext } from '$lib/server/auth/AuthContext';
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
	const { workosUser, dbUser } = await getAuthContext(event);
	if (!workosUser) {
		return { user: null };
	}

	const user: LayoutUser = {
		id: workosUser.id,
		email: workosUser.email,
		firstName: workosUser.firstName,
		lastName: workosUser.lastName,
		profilePictureUrl: workosUser.profilePictureUrl,
		username: dbUser?.username ?? null
	};

	return { user };
};
