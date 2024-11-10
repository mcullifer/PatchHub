import type { ISteamApp, ITopSteamGames } from '$lib/models/Steam';
import { applist } from './steam-games-list.json';

export class SteamGameService {
	// This is the incorrect list since it includes DLCs and other non-games
	// We need to use GetPartnerAppListForWebAPIKey from https://partner.steamgames.com/doc/webapi/ISteamApps
	// but it requires a steam api key
	private static _games: ISteamApp[] = applist.apps as ISteamApp[];

	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static getName(appId: number): string {
		const game = this._games.find((game) => game.appid === appId);
		return game ? game.name : '';
	}

	public static search(query: string) {
		const parsed = (input: string) =>
			input.trim().replace('-', '').replace(':', '').replace(' ', '').toLowerCase();

		const parsedQuery = parsed(query);
		// sort by string length
		return this._games
			.filter(
				(game) => parsed(game.name).startsWith(parsedQuery) || game.appid.toString() === parsedQuery
			)
			.sort((a, b) => a.name.length - b.name.length)
			.slice(0, 20);
	}
}
