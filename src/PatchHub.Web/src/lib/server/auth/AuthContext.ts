import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { AuthKitAuth } from '@workos/authkit-sveltekit';
import { findUserByAuthProviderId, type User } from './users';

type WorkOSUser = NonNullable<AuthKitAuth['user']>;
export type InternalUserStatus = 'unauthenticated' | 'missing' | 'active' | 'deleted';

export type AuthContext = {
	workosUser: WorkOSUser | null;
	dbUser: User | null;
	internalUserId: User['_id'] | null;
	internalUserStatus: InternalUserStatus;
	organizationId: string | null;
};

export async function getAuthContext(event: RequestEvent): Promise<AuthContext> {
	const workosUser = event.locals.auth.user ?? null;
	if (!workosUser) {
		return {
			workosUser: null,
			dbUser: null,
			internalUserId: null,
			internalUserStatus: 'unauthenticated',
			organizationId: event.locals.auth.organizationId ?? null
		};
	}

	const userRecord = await findUserByAuthProviderId(workosUser.id);
	const dbUser = userRecord && !userRecord.deletedAt ? userRecord : null;
	const internalUserStatus = getInternalUserStatus(userRecord);

	return {
		workosUser,
		dbUser,
		internalUserId: dbUser?._id ?? null,
		internalUserStatus,
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
	const { dbUser, internalUserStatus, workosUser } = await getAuthContext(event);
	if (!workosUser) {
		error(401, 'Unauthorized');
	}

	if (internalUserStatus === 'deleted') {
		error(403, 'Account is disabled');
	}

	if (internalUserStatus === 'missing') {
		error(401, 'Account setup is required');
	}

	if (!dbUser) {
		error(401, 'Account setup is required');
	}

	return dbUser;
}

function getInternalUserStatus(userRecord: User | null): InternalUserStatus {
	if (!userRecord) return 'missing';
	return userRecord.deletedAt ? 'deleted' : 'active';
}
