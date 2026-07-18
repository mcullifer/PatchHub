import { error, type RequestEvent } from '@sveltejs/kit';
import { requireInternalUser } from './AuthContext';

export async function requirePatchHubAdmin(event: RequestEvent) {
	const user = await requireInternalUser(event);

	if (user.platformRole !== 'admin') {
		error(403, 'Forbidden');
	}

	return user;
}
