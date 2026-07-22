import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { ConvexHttpClient } from 'convex/browser';
import type { RequestEvent } from '@sveltejs/kit';

// Clients are created per operation because Worker module globals outlive requests.
export function createConvexClient(): ConvexHttpClient {
	return new ConvexHttpClient(PUBLIC_CONVEX_URL, { fetch: getRequestFetch() });
}

export function createViewerConvexClient(event: RequestEvent): ConvexHttpClient {
	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL, { fetch: event.fetch });
	const accessToken = event.locals.auth.accessToken;
	if (accessToken) client.setAuth(accessToken);
	return client;
}

export function createAuthenticatedConvexClient(event: RequestEvent): ConvexHttpClient {
	const accessToken = event.locals.auth.accessToken;
	if (!accessToken) {
		throw new Error('Authenticated WorkOS session is missing an access token');
	}

	const client = new ConvexHttpClient(PUBLIC_CONVEX_URL, { fetch: event.fetch });
	client.setAuth(accessToken);
	return client;
}

// SvelteKit warns on global fetch during SSR; use the event's fetch when a
// request context exists (e.g. not inside Convex-agnostic scripts/tests).
function getRequestFetch(): typeof fetch {
	try {
		return getRequestEvent().fetch;
	} catch {
		return fetch;
	}
}

export function getConvexServerSecret(): string {
	const secret = env.CONVEX_SERVER_SECRET;
	if (!secret) throw new Error('CONVEX_SERVER_SECRET is not set');
	return secret;
}
