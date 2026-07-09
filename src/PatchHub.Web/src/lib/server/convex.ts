import { env } from '$env/dynamic/private';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { ConvexHttpClient } from 'convex/browser';

// Server-side Convex client. User-scoped Convex functions are gated by a
// shared secret so they can only be called by this server, which owns the
// WorkOS session and passes the verified authProviderId along.
export const convex = new ConvexHttpClient(PUBLIC_CONVEX_URL);

export function getConvexServerSecret(): string {
	const secret = env.CONVEX_SERVER_SECRET;
	if (!secret) throw new Error('CONVEX_SERVER_SECRET is not set');
	return secret;
}
