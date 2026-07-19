import { getRequestEvent, query } from '$app/server';
import type { INamedSteamGame, IRankedSteamGame, ISteamApp } from '$lib/models/Steam';
import { ConvexCache } from '$lib/server/cache/ConvexCache';
import { getAppNews, getPopularSteamGames } from '$lib/server/steam/SteamApiClient';
import {
	attachSteamAppNames,
	getSteamAppNamesByAppIds,
	searchSteamApps
} from '$lib/server/steam/SteamCatalogRepository';
import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService';
import { Time } from '$lib/util/time';
import * as v from 'valibot';

const popularGamesTtlMs = Time.HOUR;
const gameNewsTtlMs = Time.MINUTE * 15;

export const getGameNews = query(
	v.object({
		appid: v.number(),
		count: v.optional(v.number(), 10)
	}),
	async ({ appid, count }) => {
		if (!appid) return null;
		const event = getRequestEvent();
		try {
			const result = await new ConvexCache().getOrCreate(
				`steam:news:${appid}:${count}`,
				async () => {
					const response = await getAppNews({
						appid: appid.toString(),
						count,
						fetchFn: event.fetch
					});
					return response.appnews;
				},
				{ ttlMs: gameNewsTtlMs }
			);
			return result?.value ?? null;
		} catch {
			return null;
		}
	}
);

export const getMostPopularGames = query(async (): Promise<INamedSteamGame[]> => {
	const event = getRequestEvent();
	let upstreamFailure: unknown = null;
	try {
		const result = await new ConvexCache().getOrCreate(
			'steam:popular',
			async () => {
				try {
					const rankedGames = await getPopularSteamGames({ fetchFn: event.fetch });
					const rankedGamesWithName = await getAppNames(rankedGames.ranks);
					return rankedGamesWithName.filter((game) => game.name !== '' && game.name !== undefined);
				} catch (error) {
					upstreamFailure = error;
					throw error;
				}
			},
			{ ttlMs: popularGamesTtlMs }
		);
		if (upstreamFailure) {
			console.error('Failed to fetch popular Steam games', upstreamFailure);
		}
		return result?.value ?? [];
	} catch (error) {
		const message = upstreamFailure
			? 'Failed to fetch popular Steam games'
			: 'Failed to read popular Steam games cache';
		console.error(message, error);
		return [];
	}
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
