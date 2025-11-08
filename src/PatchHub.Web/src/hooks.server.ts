import {
	WORKOS_API_KEY,
	WORKOS_CLIENT_ID,
	WORKOS_COOKIE_PASSWORD,
	WORKOS_REDIRECT_URI
} from '$env/static/private';
import { findUserByAuthProviderId } from '$lib/server/UserService';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { authKitHandle, configureAuthKit } from '@workos/authkit-sveltekit';

// Configure AuthKit with SvelteKit's environment variables
configureAuthKit({
	clientId: WORKOS_CLIENT_ID,
	apiKey: WORKOS_API_KEY,
	redirectUri: WORKOS_REDIRECT_URI,
	cookiePassword: WORKOS_COOKIE_PASSWORD
});

// There is a weird WorkOS error that says
// "Failed to revoke session on WorkOS." even though it does.
const authHandle = authKitHandle({
	debug: false,
	onError: () => {}
});

// Custom handle to redirect new users to account setup
const provisionUserHandle: Handle = async ({ event, resolve }) => {
	// Skip if user is not authenticated
	if (!event.locals.auth.user) return resolve(event);

	// Skip if already on the setup page to avoid redirect loops
	if (event.url.pathname === '/auth/setup') return resolve(event);

	const workosUserId = event.locals.auth.user.id;

	try {
		// Check if user exists in our database
		const dbUser = await findUserByAuthProviderId(workosUserId);
		if (!dbUser) {
			// Redirect to setup page if user doesn't exist
			return Response.redirect(new URL('/auth/setup', event.url.origin), 302);
		}
	} catch (error) {
		console.error('Error checking user:', error);
		// Continue with the request even if check fails
	}

	return resolve(event);
};

// Chain the handles together
export const handle = sequence(authHandle, provisionUserHandle);
