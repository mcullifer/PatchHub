import { getRequestEvent, query } from '$app/server';
import { ApiService } from '$lib/services/ApiService';

export const getTopGames = query(async () => {
	const { fetch } = getRequestEvent();
	const api = new ApiService(fetch);
	const topGames = await api.games.mostPopular();
	return topGames;
});
