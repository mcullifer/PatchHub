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

// SvelteKit serves remote query responses with `private, no-store`. These queries
// return the same data for every user, so let browsers (and shared caches) reuse
// them briefly instead of re-invoking the worker on every navigation.
const remoteQueryCacheTtlSeconds = new Map<string, number>([
	['getMostPopularGames', 60],
	['getGameNews', 60],
	['searchGames', 60],
	['getSoftwareSourceSummaries', 60],
	['getSteamHeaderImage', 3600]
]);

const remoteCacheHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (!event.isRemoteRequest) return response;

	// event.url is rewritten to the calling page for remote requests; the
	// endpoint path (/_app/remote/<hash>/<name>) is only on the raw request.
	const name = new URL(event.request.url).pathname.match(/^\/_app\/remote\/[^/]+\/([^/]+)$/)?.[1];
	const ttl = name === undefined ? undefined : remoteQueryCacheTtlSeconds.get(name);
	// Never mark streaming responses cacheable: query.live streams must keep
	// SvelteKit's no-store (a cached clone would hold the stream open forever).
	const isStream = response.headers.get('content-type')?.includes('text/event-stream');
	if (ttl !== undefined && response.ok && !isStream) {
		response.headers.set('cache-control', `public, max-age=${ttl}`);
	}
	return response;
};

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

export const handle = sequence(remoteCacheHandle, authHandle, accountProvisioningHandle);
