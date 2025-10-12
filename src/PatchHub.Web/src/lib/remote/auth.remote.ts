import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { authKit } from '@workos/authkit-sveltekit';

export const signIn = form(async () => {
	const signInUrl = await authKit.getSignInUrl({ returnTo: '/' });
	redirect(307, signInUrl);
});
