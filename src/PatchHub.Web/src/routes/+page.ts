import { ApiService } from '$lib/services/ApiService.js';

export async function load({ fetch }) {
	const api = new ApiService(fetch);
	const topGames = await api.getMostPopularGames();
	return { topGames };
}
