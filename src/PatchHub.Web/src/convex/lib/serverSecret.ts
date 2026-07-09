// WorkOS auth lives in the SvelteKit server, not Convex. Functions that act on
// behalf of a user trust the caller-provided authProviderId, so they must only
// be callable by our own server: every such function takes a `secret` argument
// checked against the SERVER_SECRET env var on the Convex deployment.
export function requireServerSecret(secret: string): void {
	const expected = process.env.SERVER_SECRET;
	if (!expected) {
		throw new Error('SERVER_SECRET is not configured on the Convex deployment');
	}

	if (secret !== expected) {
		throw new Error('Unauthorized');
	}
}
