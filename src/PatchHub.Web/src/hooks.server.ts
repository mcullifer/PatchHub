import { env } from '$env/dynamic/private';
import { getAuthContext } from '$lib/server/auth/AuthContext';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { authKitHandle, configureAuthKit } from '@workos/authkit-sveltekit';

configureAuthKit({
	clientId: env.WORKOS_CLIENT_ID,
	apiKey: env.WORKOS_API_KEY,
	redirectUri: env.WORKOS_REDIRECT_URI,
	cookiePassword: env.WORKOS_COOKIE_PASSWORD
});

const authHandle = authKitHandle({
	debug: false,
	onError: (error) => {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('Failed to revoke session on WorkOS')) return;

		console.error('AuthKit error:', error);
	}
});

const setupExcludedPathPrefixes = ['/auth/callback', '/auth/login', '/auth/logout', '/auth/setup'];

const provisionUserHandle: Handle = async ({ event, resolve }) => {
	if (!event.locals.auth.user) return resolve(event);
	if (setupExcludedPathPrefixes.some((path) => event.url.pathname.startsWith(path))) {
		return resolve(event);
	}

	try {
		const { dbUser } = await getAuthContext(event);
		if (!dbUser) {
			return Response.redirect(new URL('/auth/setup', event.url.origin), 302);
		}
	} catch (error) {
		console.error('Error checking internal user:', error);
		return Response.redirect(new URL('/auth/setup', event.url.origin), 302);
	}

	return resolve(event);
};

export const handle = sequence(authHandle, provisionUserHandle);
