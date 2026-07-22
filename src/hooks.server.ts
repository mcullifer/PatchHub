import { env } from '$env/dynamic/private';
import { getAuthContext } from '$lib/server/auth/authContext';
import {
	getAccountProvisioningRedirect,
	shouldBypassAccountProvisioning
} from '$lib/server/auth/provisioning';
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

const accountProvisioningHandle: Handle = async ({ event, resolve }) => {
	if (!event.locals.auth.user) return resolve(event);
	if (shouldBypassAccountProvisioning(event.url.pathname)) {
		return resolve(event);
	}

	const { status } = await getAuthContext(event);
	const provisioningRedirect = getAccountProvisioningRedirect(status, event.url.origin);
	if (provisioningRedirect) {
		return provisioningRedirect;
	}

	return resolve(event);
};

export const handle = sequence(authHandle, accountProvisioningHandle);
