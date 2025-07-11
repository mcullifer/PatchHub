import type { Catalog } from '$lib/server/db/schema.js';
import { ApiService } from '$lib/services/ApiService.js';

export async function load({ fetch, parent }) {
	const api = new ApiService(fetch);
	const topGames = await api.games.mostPopular();
	const user = (await parent()).user;
	const response = {
		topGames,
		favorites: [] as Catalog[]
	};
	if (!user) return response;
	const res = await api.favorites.get();
	response.favorites = res.favorites;
	return response;
}
