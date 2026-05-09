import { findUserByAuthProviderId } from '$lib/server/UserService';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { authKit, type AuthKitAuth } from '@workos/authkit-sveltekit';
import type { User } from '../db/schema';

type WorkOSUser = NonNullable<AuthKitAuth['user']>;

export type AuthContext = {
	workosUser: WorkOSUser | null;
	dbUser: User | null;
	internalUserId: number | null;
	organizationId: string | null;
};

export async function getAuthContext(event: RequestEvent): Promise<AuthContext> {
	const workosUser = event.locals.auth.user ?? (await authKit.getUser(event));
	const dbUser = workosUser ? await findUserByAuthProviderId(workosUser.id) : null;

	return {
		workosUser,
		dbUser,
		internalUserId: dbUser?.id ?? null,
		organizationId: event.locals.auth.organizationId ?? null
	};
}

export async function requireAuth(event: RequestEvent): Promise<WorkOSUser> {
	const { workosUser } = await getAuthContext(event);
	if (!workosUser) {
		error(401, 'Unauthorized');
	}

	return workosUser;
}

export async function requireInternalUser(event: RequestEvent): Promise<User> {
	const { dbUser } = await getAuthContext(event);
	if (!dbUser) {
		error(401, 'Account setup is required');
	}

	return dbUser;
}
