import { api } from '$convex/_generated/api';
import { getWorkOSPublicUserProfile } from '$lib/server/auth/workos';
import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
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

export async function loadOwnerProfile(event: RequestEvent, createdBy: string) {
	const convex = createConvexClient();
	const profile = await convex.query(api.projects.getOwnerProfile, {
		secret: getConvexServerSecret(),
		createdBy
	});
	if (!profile) error(404, 'Not found');

	const workosUser = event.locals.auth.user ?? null;
	let profilePictureUrl: string | null = null;
	try {
		profilePictureUrl = await resolveOwnerProfilePictureUrl(profile.owner, workosUser);
	} catch (profileError) {
		console.error('Unable to load the owner profile picture from WorkOS', profileError);
	}

	return {
		owner: {
			kind: profile.owner.kind,
			id: profile.owner.id,
			name: profile.owner.name,
			profilePictureUrl,
			createdAt: profile.owner.createdAt
		},
		projects: profile.projects
	};
}

async function resolveOwnerProfilePictureUrl(
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
