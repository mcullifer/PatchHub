import type { ISteamApp, ITopSteamGames } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { games } from '$lib/server/db/schema';
import { like } from 'drizzle-orm';
import { applist } from './steam-games-list.json';

export class SteamGameService {
	private static _games: ISteamApp[] = applist.apps as ISteamApp[];

	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static getName(appId: number): string {
		const game = this._games.find((game) => game.appid === appId);
		return game ? game.name : '';
	}

	public static async search(query: string) {
		const result = await db
			.select({
				appid: games.externalId,
				name: games.name
			})
			.from(games)
			.where(like(games.name, `${query}%`))
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
