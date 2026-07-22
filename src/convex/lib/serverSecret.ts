// Service-only functions use this shared secret when there is no end-user JWT,
// such as cache, catalog sync, and protected server metadata operations.
export function requireServerSecret(secret: string): void {
	const expected = process.env.SERVER_SECRET;
	if (!expected) {
		throw new Error('SERVER_SECRET is not configured on the Convex deployment');
	}

	if (secret !== expected) {
		throw new Error('Unauthorized');
	}
}
