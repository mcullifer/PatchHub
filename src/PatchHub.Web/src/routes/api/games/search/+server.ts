import type { ISteamApp } from '$lib/models/Steam.js';
import { SteamGameService } from '$lib/server/SteamGameService.js';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const query = url.searchParams.get('query');
	let response: ISteamApp[] = [];
	if (query === null || query === '') return json(response);

	response = await SteamGameService.search(query);
	return json(response);
}
