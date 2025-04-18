import type { Catalog } from '$lib/server/db/schema.js';
import { ApiService } from '$lib/services/ApiService.js';

export async function load({ fetch, parent }) {
	const api = new ApiService(fetch);
	const topGames = await api.getMostPopularGames();
	const user = (await parent()).user;
	const response = {
		topGames,
		favorites: {
			favorites: [] as Catalog[]
		}
	};
	if (user) {
		const favorites = await api.getFavorites();
		response.favorites = favorites;
	}

	return response;
}
