import type { IRankedSteamGame } from '$lib/models/Steam';
import * as steam from '$lib/server/apis/steam';
import { SteamGameService } from '$lib/server/SteamGameService.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ setHeaders }) {
	const oneHour = 60 * 60 * 1000;
	const now = Date.now() / 1000;
	const outOfDate = SteamGameService.popularGames.last_update + oneHour < now;
	if (!outOfDate && SteamGameService.popularGames.ranks.length > 0) {
		setHeaders({ 'Cache-Control': 'max-age=300' }); // 5 minutes
		return json(SteamGameService.popularGames);
	}
	const rankedGames = await steam.popular();
	if (!rankedGames) {
		SteamGameService.popularGames = { last_update: 0, ranks: [] };
		error(500, 'Failed to retrieve top games');
	}

	const rankedGamesWithName = await Promise.all(rankedGames.ranks.map(setAppName));
	rankedGames.ranks = rankedGamesWithName.filter((g) => g.name !== '');
	SteamGameService.popularGames = rankedGames;
	setHeaders({ 'Cache-Control': 'max-age=300' }); // 5 minutes
	return json(SteamGameService.popularGames);
}

async function setAppName(rankedGame: IRankedSteamGame) {
	const app = await SteamGameService.getApp(rankedGame.appid);
	rankedGame.name = app ? app.name : '';
	return rankedGame;
}
