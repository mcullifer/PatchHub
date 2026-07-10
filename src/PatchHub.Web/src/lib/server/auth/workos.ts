import { env } from '$env/dynamic/private';
import { NotFoundException, WorkOS, type UpdateUserOptions } from '@workos-inc/node';

type ExternalIdUpdate = {
	userId: string;
	externalId: string;
};

type WorkOSPublicUserProfile = {
	id: string;
	profilePictureUrl: string | null;
};

let workosClient: WorkOS | null = null;
let workosClientApiKey: string | null = null;

function getWorkOSClient(): WorkOS {
	const apiKey = env.WORKOS_API_KEY;
	if (!apiKey) {
		throw new Error('WORKOS_API_KEY is not set');
	}

	if (!workosClient || workosClientApiKey !== apiKey) {
		workosClient = new WorkOS(apiKey);
		workosClientApiKey = apiKey;
	}

	return workosClient;
}

export function buildWorkOSExternalIdUpdate(update: ExternalIdUpdate): UpdateUserOptions {
	return {
		userId: update.userId,
		externalId: update.externalId
	};
}

export async function updateWorkOSUserExternalId(update: ExternalIdUpdate): Promise<void> {
	await getWorkOSClient().userManagement.updateUser(buildWorkOSExternalIdUpdate(update));
}

export async function getWorkOSPublicUserProfile(
	userId: string
): Promise<WorkOSPublicUserProfile | null> {
	try {
		const user = await getWorkOSClient().userManagement.getUser(userId);
		return {
			id: user.id,
			profilePictureUrl: user.profilePictureUrl
		};
	} catch (profileError) {
		if (profileError instanceof NotFoundException) {
			return null;
		}

		throw profileError;
	}
}
