import { browser } from '$app/environment';
import { getProjectPost } from '$lib/remote/projectPosts.remote';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// SSR-only gate: resolving the query before rendering lets a missing post — or a
// non-owner reaching the editor — produce a real 404 status.
export const load: PageLoad = async ({ params, parent }) => {
	if (browser) return;

	const [result, { user }] = await Promise.all([
		getProjectPost({
			createdBy: params.createdBy,
			projectSlug: params.project,
			postSlug: params.post
		}),
		parent()
	]);
	if (user?.id !== result.project.owner.id) error(404, 'Not found');
};
