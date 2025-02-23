import type { ISteamApp, ITopSteamGames } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { catalog } from '$lib/server/db/schema';
import { like } from 'drizzle-orm';

export class SteamGameService {
	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static async getApp(appId: number): Promise<ISteamApp | undefined> {
		const result = await db.query.catalog.findFirst({
			columns: {
				externalId: true,
				name: true
			},
			where: (catalog, { eq }) => eq(catalog.externalId, appId.toString())
		});
		if (!result) return;
		return {
			appid: parseInt(result.externalId),
			name: result.name
		};
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
