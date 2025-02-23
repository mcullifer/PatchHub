import { ApiService } from '$lib/services/ApiService.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	if (!params.name) error(404, 'Software not found');
	const api = new ApiService(fetch);
	const data = await api.getMostPopularSoftware();
	if (!data) error(404, 'Software not found');
	return {
		softwareName: params.name,
		news: data.software
	};
}
