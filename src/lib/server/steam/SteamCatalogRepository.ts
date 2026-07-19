import type { INamedSteamGame, ISteamApp } from '$lib/models/Steam';
import { createConvexClient } from '$lib/server/convex';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';

export async function findSteamAppByAppId(appId: number) {
	return await createConvexClient().query(api.catalog.getSteamAppByAppId, { appid: appId });
}

export async function getSteamAppNamesByAppIds(
	appIds: number[]
): Promise<Record<string, { id: Id<'externalItems'>; name: string; slug: string }>> {
	if (appIds.length === 0) return {};
	return await createConvexClient().query(api.catalog.getSteamAppNamesByAppIds, { appIds });
}

export async function searchSteamApps(query: string): Promise<ISteamApp[]> {
	if (!query.trim()) return [];
	return await createConvexClient().query(api.catalog.searchSteam, { query });
}

export function attachSteamAppNames(
	rankedGames: Array<Omit<INamedSteamGame, 'name' | 'slug'>>,
	appNames: Record<string, { id: Id<'externalItems'>; name: string; slug: string }>
): INamedSteamGame[] {
	return rankedGames.map((game) => {
		const app = appNames[game.appid.toString()];
		return {
			...game,
			name: app?.name || '',
			slug: app?.slug,
			externalItemId: app?.id ?? null
		};
	});
}
