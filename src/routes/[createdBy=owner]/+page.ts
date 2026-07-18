import { browser } from '$app/environment';
import { getOwnerProfile } from '$lib/remote/projects.remote';
import type { PageLoad } from './$types';

// SSR-only gate: resolving the query before rendering lets an unknown owner
// produce a real 404 status, which streamed boundary rendering cannot.
export const load: PageLoad = async ({ params }) => {
	if (browser) return;

	await getOwnerProfile(params.createdBy);
};
