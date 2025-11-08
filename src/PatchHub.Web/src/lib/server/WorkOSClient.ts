import { WORKOS_API_KEY } from '$env/static/private';
import { WorkOS, type UpdateUserOptions } from '@workos-inc/node';

// Initialize WorkOS client singleton
export const workosClient = new WorkOS(WORKOS_API_KEY);

/**
 * Updates a user in WorkOS
 * @param opts - The update options
 */
export async function updateWorkOSUser(opts: UpdateUserOptions) {
	await workosClient.userManagement.updateUser(opts);
}

export async function getUserMetadata(userId: string) {
	const user = await workosClient.userManagement.getUser(userId);
	return user;
}
