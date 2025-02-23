import { db } from '$lib/server/db/index.js';
import { ApiService } from '$lib/services/ApiService';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const { createdBy, name } = params;
	const result = await db.query.catalog.findFirst({
		columns: {
			id: true,
			name: true,
			externalId: true,
			type: true,
			createdBy: true
		},
		where: (catalog, { and, eq }) =>
			and(eq(catalog.normalizedName, name), eq(catalog.createdBy, createdBy))
	});
	if (!result) error(404, 'Not found');
	if (result.type === 'game') {
		const api = new ApiService(fetch);
		if (result.externalId === null) error(500, 'No external id');
		const parsedId = parseInt(result.externalId);
		if (isNaN(parsedId)) error(500, 'Invalid external id');
		const news = api.getNews(parsedId, 10);
		return {
			gameName: result.name,
			news: news
		};
	}
	return {
		item: result
	};
}
