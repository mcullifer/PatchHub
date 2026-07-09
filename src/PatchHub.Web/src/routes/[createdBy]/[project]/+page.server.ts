import { convex } from '$lib/server/convex';
import { error } from '@sveltejs/kit';
import { api } from '$convex/_generated/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { createdBy, project } = params;
	const item = await convex.query(api.projects.getByOwnerAndSlug, {
		createdBy,
		projectSlug: project
	});
	if (!item) error(404, 'Not found');

	return {
		item
	};
};
