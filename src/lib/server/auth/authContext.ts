import { api } from '$convex/_generated/api';
import type { Doc } from '$convex/_generated/dataModel';
import { createConvexClient } from '$lib/server/convex';
import { error, type RequestEvent } from '@sveltejs/kit';
import type { AuthKitAuth } from '@workos/authkit-sveltekit';

type WorkOSUser = NonNullable<AuthKitAuth['user']>;
export type AccountStatus = 'unauthenticated' | 'missing' | 'active' | 'deleted';

export type AuthContext = {
	workosUser: WorkOSUser | null;
	user: Doc<'users'> | null;
	status: AccountStatus;
};

export function getAuthContext(event: RequestEvent): Promise<AuthContext> {
	event.locals.authContext ??= loadAuthContext(event);
	return event.locals.authContext;
}

async function loadAuthContext(event: RequestEvent): Promise<AuthContext> {
	const workosUser = event.locals.auth.user ?? null;
	if (!workosUser) {
		return {
			workosUser: null,
			user: null,
			status: 'unauthenticated'
		};
	}

	const convex = createConvexClient(event);
	const userRecord = await convex.query(api.users.getCurrent, {});

	return {
		workosUser,
		user: userRecord && !userRecord.deletedAt ? userRecord : null,
		status: getAccountStatus(userRecord)
	};
}

export function requireAuth(event: RequestEvent): WorkOSUser {
	const workosUser = event.locals.auth.user;
	if (!workosUser) {
		error(401, 'Unauthorized');
	}

	return workosUser;
}

function getAccountStatus(userRecord: Doc<'users'> | null): AccountStatus {
	if (!userRecord) return 'missing';
	return userRecord.deletedAt ? 'deleted' : 'active';
}
