import { SteamGameService } from '$lib/server/SteamGameService.js';
import { ApiService } from '$lib/services/ApiService.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	if (!params.id) error(404, 'Game not found');
	const parsedId = parseInt(params.id);
	const gameName = SteamGameService.getName(parsedId);
	const news = ApiService.getNews(parsedId, 10, fetch);

	return {
		gameName: gameName,
		news: news
	}
}