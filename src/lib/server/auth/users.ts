import { api } from '$convex/_generated/api';
import type { Doc } from '$convex/_generated/dataModel';
import { convex, getConvexServerSecret } from '../convex';

export type User = Doc<'users'>;

export async function findUserByAuthProviderId(authProviderId: string): Promise<User | null> {
	return await convex.query(api.users.getByAuthProviderId, {
		secret: getConvexServerSecret(),
		authProviderId
	});
}

export async function isUsernameTaken(username: string): Promise<boolean> {
	return await convex.query(api.users.isUsernameTaken, { username });
}

export async function getOrCreateUserForWorkOSUser(
	authProviderId: string,
	email: string | null,
	username: string,
	createdAt: Date,
	updatedAt: Date
): Promise<User> {
	return await convex.mutation(api.users.getOrCreate, {
		secret: getConvexServerSecret(),
		authProviderId,
		email: email ?? undefined,
		username,
		createdAt: createdAt.getTime(),
		updatedAt: updatedAt.getTime()
	});
}
