import { findUserByAuthProviderId } from '$lib/server/UserService';
import { authKit } from '@workos/authkit-sveltekit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = await authKit.getUser(event);
	if (user) {
		const internalUser = await findUserByAuthProviderId(user.id);
		if (internalUser) {
			user.metadata = {
				username: internalUser.username!
			};
		}
	}
	console.log(user);
	return { user };
};
