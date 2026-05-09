import { query } from '$app/server';
import type { INamedSteamGame, IRankedSteamGame } from '$lib/models/Steam';
import * as steam from '$lib/server/apis/steam';
import { SteamGameService } from '$lib/server/SteamGameService';
import { error } from '@sveltejs/kit';

export const getTopGames = query(async () => {
	const oneHour = 60 * 60 * 1000;
	const now = Date.now() / 1000;
	const outOfDate = SteamGameService.popularGames.last_update + oneHour < now;

	if (!outOfDate && SteamGameService.popularGames.ranks.length > 0) {
		return SteamGameService.popularGames.ranks;
	}

	const rankedGames = await steam.popular();
	if (!rankedGames) {
		SteamGameService.popularGames = { last_update: 0, ranks: [] };
		error(500, 'Failed to retrieve top games');
	}

	const rankedGamesWithName = await getAppNames(rankedGames.ranks);
	const filtered = rankedGamesWithName.filter((g) => g.name !== '' && g.name !== undefined);
	SteamGameService.popularGames = {
		last_update: rankedGames.last_update,
		ranks: filtered
	};

	return SteamGameService.popularGames.ranks;
});

async function getAppNames(rankedGames: IRankedSteamGame[]): Promise<INamedSteamGame[]> {
	const appIds = rankedGames.map((g) => g.appid);
	const appNames = await SteamGameService.getNamesForApps(appIds);
	return rankedGames.map((game) => {
		const app = appNames[game.appid.toString()];
		return {
			...game,
			name: app?.name || '',
			slug: app?.slug
		};
	});
}
