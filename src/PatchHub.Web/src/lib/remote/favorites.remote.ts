import { getRequestEvent, query } from '$app/server';
import { ApiService } from '$lib/services/ApiService';

export const getFavorites = query(async () => {
	const { fetch, locals } = getRequestEvent();
	if (!locals.user) return [];
	const api = new ApiService(fetch);
	const favorites = await api.favorites.get();
	// TODO: need to remove the extra layer of "favorites" here
	// in api.favorites.get as well as /api/favorites + related files
	return favorites.favorites;
});
