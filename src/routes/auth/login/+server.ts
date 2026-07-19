import { normalizeReturnTo } from '$lib/server/auth/returnTo';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { authKit } from '@workos/authkit-sveltekit';

export const GET: RequestHandler = async ({ url }) => {
	const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));
	const signInUrl = await authKit.getSignInUrl({ returnTo });

	redirect(302, signInUrl);
};
