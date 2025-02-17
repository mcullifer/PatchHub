import type { ISteamApp, ITopSteamGames } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { game } from '$lib/server/db/schema';
import { like } from 'drizzle-orm';

export class SteamGameService {
	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static async getApp(appId: number): Promise<ISteamApp | undefined> {
		const result = await db.query.game.findFirst({
			columns: {
				externalId: true,
				name: true
			},
			where: (game, { eq }) => eq(game.externalId, appId.toString())
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
				appid: game.externalId,
				name: game.name
			})
			.from(game)
			.where(like(game.name, `${query}%`))
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
