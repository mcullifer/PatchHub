import { getRequestEvent, query } from '$app/server';
import type { INamedSteamGame, IRankedSteamGame, ISteamApp } from '$lib/models/Steam';
import { getAppNews, getPopularSteamGames } from '$lib/server/steam/SteamApiClient';
import {
	attachSteamAppNames,
	getSteamAppNamesByAppIds,
	searchSteamApps
} from '$lib/server/steam/SteamCatalogRepository';
import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService';
import * as v from 'valibot';

let popularGamesCache: { lastUpdate: number; ranks: INamedSteamGame[] } = {
	lastUpdate: 0,
	ranks: []
};

export const getGameNews = query(
	v.object({
		appid: v.number(),
		count: v.optional(v.number(), 10)
	}),
	async ({ appid, count }) => {
		if (!appid) return null;
		const event = getRequestEvent();
		try {
			const response = await getAppNews({
				appid: appid.toString(),
				count,
				fetchFn: event.fetch
			});
			return response.appnews;
		} catch {
			return null;
		}
	}
);

export const getMostPopularGames = query(async (): Promise<INamedSteamGame[]> => {
	const event = getRequestEvent();
	const oneHour = 60 * 60;
	const now = Date.now() / 1000;
	const outOfDate = popularGamesCache.lastUpdate + oneHour < now;

	if (!outOfDate && popularGamesCache.ranks.length > 0) {
		return popularGamesCache.ranks;
	}

	let rankedGames;
	try {
		rankedGames = await getPopularSteamGames({ fetchFn: event.fetch });
	} catch (fetchError) {
		console.error('Failed to fetch popular Steam games', fetchError);
		popularGamesCache = { lastUpdate: 0, ranks: [] };
		return [];
	}

	const rankedGamesWithName = await getAppNames(rankedGames.ranks);
	const filtered = rankedGamesWithName.filter((g) => g.name !== '' && g.name !== undefined);

	popularGamesCache = {
		lastUpdate: rankedGames.last_update,
		ranks: filtered
	};

	return filtered;
});

export const searchGames = query(v.string(), async (searchQuery): Promise<ISteamApp[]> => {
	if (!searchQuery || searchQuery.trim() === '') return [];
	return await searchSteamApps(searchQuery);
});

export const getSteamHeaderImage = query(v.number(), async (appid): Promise<string | null> => {
	if (!Number.isInteger(appid)) return null;

	const event = getRequestEvent();
	return await getSteamHeaderImageUrl(event.fetch, appid);
});

async function getAppNames(rankedGames: IRankedSteamGame[]): Promise<INamedSteamGame[]> {
	const appIds = rankedGames.map((game) => game.appid);
	const appNames = await getSteamAppNamesByAppIds(appIds);
	return attachSteamAppNames(rankedGames, appNames);
}
