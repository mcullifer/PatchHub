import { browser } from '$app/environment';
import { getProjectPosts } from '$lib/remote/projectPosts.remote';
import type { PageLoad } from './$types';

// SSR-only gate: resolving the query before rendering lets a missing project
// produce a real 404 status, which streamed boundary rendering cannot.
export const load: PageLoad = async ({ params }) => {
	if (browser) return;

	await getProjectPosts({ createdBy: params.createdBy, projectSlug: params.project });
};
