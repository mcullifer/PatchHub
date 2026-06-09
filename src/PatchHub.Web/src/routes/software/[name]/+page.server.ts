import { SoftwareUpdateService } from '$lib/server/software/SoftwareUpdateService.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	if (!params.name) error(404, 'Software not found');

	const data = await SoftwareUpdateService.getSourceDetail(params.name, 25, fetch);
	if (!data) error(404, 'Software not found');

	return {
		detail: data
	};
};
