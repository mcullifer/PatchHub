import { query } from '$app/server';
import type { INamedSteamGame, IRankedSteamGame, ISteamApp } from '$lib/models/Steam';
import * as steam from '$lib/server/apis/steam';
import { SteamGameService } from '$lib/server/SteamGameService';
import * as v from 'valibot';

export const getGameNews = query(
	v.object({
		appid: v.number(),
		count: v.optional(v.number(), 10)
	}),
	async ({ appid, count }) => {
		if (!appid) return null;
		const response = await steam.news(appid.toString(), count.toString());
		if (!response) return null;
		return response.appnews;
	}
);

export const getMostPopularGames = query(async (): Promise<INamedSteamGame[]> => {
	const oneHour = 60 * 60 * 1000;
	const now = Date.now() / 1000;
	const outOfDate = SteamGameService.popularGames.last_update + oneHour < now;

	if (!outOfDate && SteamGameService.popularGames.ranks.length > 0) {
		return SteamGameService.popularGames.ranks;
	}

	const rankedGames = await steam.popular();
	if (!rankedGames) {
		SteamGameService.popularGames = { last_update: 0, ranks: [] };
		return [];
	}

	const rankedGamesWithName = await getAppNames(rankedGames.ranks);
	const filtered = rankedGamesWithName.filter((g) => g.name !== '' && g.name !== undefined);

	// Update cache with named games
	SteamGameService.popularGames = {
		last_update: rankedGames.last_update,
		ranks: filtered
	};

	return filtered;
});

export const searchGames = query(v.string(), async (searchQuery): Promise<ISteamApp[]> => {
	if (!searchQuery || searchQuery.trim() === '') return [];
	return await SteamGameService.search(searchQuery);
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
