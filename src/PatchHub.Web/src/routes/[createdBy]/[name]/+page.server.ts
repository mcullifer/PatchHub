import { getGameNews } from '$lib/remote/games.remote';
import { db } from '$lib/server/db/index.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const { createdBy, name } = params;
	const item = await db.query.externalItem.findFirst({
		columns: {
			id: true,
			name: true,
			externalId: true,
			type: true
		},
		where: (externalItem, { and, eq }) =>
			and(eq(externalItem.normalizedName, name.toUpperCase()), eq(externalItem.type, createdBy))
	});
	if (!item) error(404, 'Not found');
	if (item.type === 'steam') {
		if (item.externalId === null) error(500, 'No external id');
		const parsedId = parseInt(item.externalId);
		if (isNaN(parsedId)) error(500, 'Invalid external id');
		const news = getGameNews({ appid: parsedId, count: 10 });
		return {
			item,
			news
		};
	}
	return {
		item
	};
}
