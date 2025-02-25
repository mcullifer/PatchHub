import { ApiService } from '$lib/services/ApiService.js';

export async function load({ fetch }) {
	const api = new ApiService(fetch);
	const topGames = await api.getMostPopularGames();
	const favorites = await api.getFavorites();
	return { topGames, favorites };
}
