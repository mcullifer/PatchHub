import { api } from '$convex/_generated/api';
import { normalizeUsername } from '$convex/lib/usernames';
import { getAuthContext } from '$lib/server/auth/AuthContext';
import { getWorkOSPublicUserProfile } from '$lib/server/auth/workos';
import { convex, getConvexServerSecret } from '$lib/server/convex';
import { error, type RequestEvent } from '@sveltejs/kit';

type OwnerProfileOwner =
	| {
			kind: 'user';
			name: string;
			authProviderId: string;
			createdAt: number;
	  }
	| {
			kind: 'org';
			name: string;
			createdAt: number;
	  };

type WorkOSProfileUser = {
	id: string;
	profilePictureUrl: string | null;
};

type WorkOSProfileLookup = (userId: string) => Promise<WorkOSProfileUser | null>;

export async function getOwnerProfileForEvent(event: RequestEvent, createdBy: string) {
	const profile = await convex.query(api.projects.getOwnerProfileForServer, {
		secret: getConvexServerSecret(),
		createdBy
	});
	if (!profile) error(404, 'Not found');

	const { dbUser, workosUser } = await getAuthContext(event);
	let profilePictureUrl: string | null = null;
	try {
		profilePictureUrl = await resolveOwnerProfilePictureUrl(profile.owner, workosUser);
	} catch (profileError) {
		console.error('Unable to load the owner profile picture from WorkOS', profileError);
	}

	return {
		owner: {
			kind: profile.owner.kind,
			name: profile.owner.name,
			profilePictureUrl,
			createdAt: profile.owner.createdAt
		},
		projects: profile.projects,
		isOwner: dbUser?.username === normalizeUsername(createdBy)
	};
}

export async function resolveOwnerProfilePictureUrl(
	owner: OwnerProfileOwner,
	workosUser: WorkOSProfileUser | null,
	getPublicProfile: WorkOSProfileLookup = getWorkOSPublicUserProfile
): Promise<string | null> {
	if (owner.kind === 'org') return null;
	if (workosUser?.id === owner.authProviderId) {
		return workosUser.profilePictureUrl;
	}

	return (await getPublicProfile(owner.authProviderId))?.profilePictureUrl ?? null;
}
