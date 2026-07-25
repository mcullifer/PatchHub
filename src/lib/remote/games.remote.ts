import { getRequestEvent, query } from '$app/server';
import { api } from '$convex/_generated/api';
import type { IPopularSteamGame } from '$lib/models/Steam';
import { ConvexCache } from '$lib/server/cache/ConvexCache';
import { createConvexClient } from '$lib/server/convex';
import { DEFAULT_NEWS_COUNT, fetchGameNews, fetchPopularGames } from '$lib/server/steam/api';
import { resolveHeaderImageUrl } from '$lib/server/steam/images';
import { Time } from '$lib/util/time';
import * as v from 'valibot';

const popularGamesTtlMs = Time.HOUR;
const gameNewsTtlMs = Time.MINUTE * 15;

const steamAppIdSchema = v.number();
const gameNewsSchema = v.object({
	appid: steamAppIdSchema,
	count: v.optional(v.number(), DEFAULT_NEWS_COUNT)
});

export const getGameNews = query(gameNewsSchema, async ({ appid, count }) => {
	if (!appid) return null;

	const event = getRequestEvent();
	try {
		const result = await new ConvexCache().getOrCreate(
			`steam:news:${appid}:${count}`,
			async () => {
				const response = await fetchGameNews({ appId: appid, count, fetchFn: event.fetch });
				return response.appnews;
			},
			{ ttlMs: gameNewsTtlMs }
		);
		return result?.value ?? null;
	} catch {
		return null;
	}
});

export const getMostPopularGames = query(async () => {
	const event = getRequestEvent();
	try {
		const result = await new ConvexCache().getOrCreate(
			'steam:popular',
			() => loadPopularGames(event.fetch),
			{ ttlMs: popularGamesTtlMs }
		);
		return result?.value ?? [];
	} catch (error) {
		console.error('Failed to load popular Steam games', error);
		return [];
	}
});

export const getSteamHeaderImage = query(steamAppIdSchema, async (appid) => {
	if (!Number.isInteger(appid)) return null;

	const event = getRequestEvent();
	return resolveHeaderImageUrl(event.fetch, appid);
});

async function loadPopularGames(fetchFn: typeof fetch) {
	const { ranks: rankedGames } = await fetchPopularGames(fetchFn);
	if (rankedGames.length === 0) return [];

	const appIds = rankedGames.map((game) => game.appid);
	const catalogGames = await createConvexClient().query(api.catalog.getSteamAppNamesByAppIds, {
		appIds
	});
	const games: IPopularSteamGame[] = [];

	for (const game of rankedGames) {
		const catalogGame = catalogGames[game.appid.toString()];
		if (!catalogGame?.name) continue;

		games.push({
			...game,
			name: catalogGame.name,
			slug: catalogGame.slug,
			externalItemId: catalogGame.id
		});
	}

	return games;
}
