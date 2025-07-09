import type { ISteamApp, ITopSteamGames } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { catalog } from '$lib/server/db/schema';
import { inArray, isNotNull, like } from 'drizzle-orm';

export class SteamGameService {
	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static async getApp(appId: number) {
		const result = await db.query.catalog.findFirst({
			where: (catalog, { eq }) => eq(catalog.externalId, appId.toString())
		});
		if (!result) return;
		return result;
	}

	public static async getNamesForApps(appIds: number[]) {
		const res = await db
			.select({
				appid: catalog.externalId,
				name: catalog.name
			})
			.from(catalog)
			.where(
				inArray(
					catalog.externalId,
					appIds.map((a) => a.toString())
				) && isNotNull(catalog.externalId)
			);
		const appNames: Record<string, string> = {};
		for (const app of res) {
			if (app.appid === null || app.name === null) continue;
			appNames[app.appid] = app.name;
		}
		return appNames;
	}

	public static async search(query: string) {
		const result = await db
			.select({
				appid: catalog.externalId,
				name: catalog.name
			})
			.from(catalog)
			.where(like(catalog.name, `%${query}%`))
			.limit(20);
		if (!result || result.length === 0) return [];

		return result.map((g) => {
			return {
				appid: parseInt(g.appid),
				name: g.name
			};
		}) as ISteamApp[];
	}
}
