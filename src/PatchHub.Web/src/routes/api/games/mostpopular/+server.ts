import { STEAM_API_URL } from '$env/static/private';
import type { IRankedSteamGame, ITopSteamGames } from '$lib/models/Steam';
import { SteamGameService } from '$lib/server/SteamGameService.js';
import { json } from '@sveltejs/kit';

const MOST_PLAYED_ROUTE = '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/';

export async function GET({ fetch, setHeaders }) {
	const url = STEAM_API_URL + MOST_PLAYED_ROUTE;
	const oneHour = 60 * 60 * 1000;
	const now = Date.now() / 1000;
	const outOfDate = SteamGameService.popularGames.last_update + oneHour < now;
	if (SteamGameService.popularGames.ranks.length === 0 || outOfDate) {
		const response = await fetch(url);
		const responseJson = await response.json();
		const rankedGames = responseJson.response as ITopSteamGames;
		const promises = rankedGames.ranks.map(setAppName);
		const rankedGamesWithName = await Promise.all(promises);
		rankedGames.ranks = rankedGamesWithName.filter((g) => g.name !== '');
		SteamGameService.popularGames = rankedGames;
	}
	setHeaders({ 'Cache-Control': 'max-age=300' }); // 5 minutes
	return json(SteamGameService.popularGames);
}

async function setAppName(rankedGame: IRankedSteamGame) {
	const app = await SteamGameService.getApp(rankedGame.appid);
	rankedGame.name = app ? app.name : '';
	return rankedGame;
}
