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
		return json(SteamGameService.popularGames.ranks);
	}
	const rankedGames = await steam.popular();
	if (!rankedGames) {
		SteamGameService.popularGames = { last_update: 0, ranks: [] };
		error(500, 'Failed to retrieve top games');
	}

	const rankedGamesWithName = await getAppNames(rankedGames.ranks);
	const filtered = rankedGamesWithName.filter((g) => g.name !== '' && g.name !== undefined);
	rankedGames.ranks = filtered;
	SteamGameService.popularGames = rankedGames;
	setHeaders({ 'Cache-Control': 'max-age=300' }); // 5 minutes
	return json(SteamGameService.popularGames.ranks);
}

async function getAppNames(rankedGames: IRankedSteamGame[]) {
	const appIds = rankedGames.map((g) => g.appid);
	const appNames = await SteamGameService.getNamesForApps(appIds);
	return rankedGames.map((game) => {
		return {
			...game,
			name: appNames[game.appid.toString()] || ''
		};
	});
}
