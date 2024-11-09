import { STEAM_API_URL } from '$env/static/private';
import type { ITopSteamGames } from '$lib/models/Steam';
import { SteamGameService } from '$lib/server/SteamGameService.js';
import { json } from '@sveltejs/kit';

const MOST_PLAYED_ROUTE = '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/';

export async function GET({ fetch }) {
	const url = STEAM_API_URL + MOST_PLAYED_ROUTE;
	const oneHour = 60 * 60 * 1000;
	const now = Date.now() / 1000;
	const outOfDate = SteamGameService.popularGames.last_update + oneHour < now;
	if (SteamGameService.popularGames.ranks.length === 0 || outOfDate) {
		const response = await fetch(url);
		const responseJson = await response.json();
		const rankedGames = responseJson.response as ITopSteamGames;
		await applySteamAppNames(rankedGames);
		SteamGameService.popularGames = rankedGames;
	}
	return json(SteamGameService.popularGames);
}

async function applySteamAppNames(rankedGames: ITopSteamGames) {
	for (let i = 0; i < rankedGames.ranks.length; i++) {
		rankedGames.ranks[i].name = await SteamGameService.getName(rankedGames.ranks[i].appid);
	}
}
