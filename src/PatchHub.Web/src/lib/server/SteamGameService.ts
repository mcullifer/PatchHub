import type { ITopSteamGames, SteamApp, SteamAppListJsonModel } from '$lib/models/Steam';
import steamJson from './steam-games-list.json';

export class SteamGameService {
	// This is the incorrect list since it includes DLCs and other non-games
	// We need to use GetPartnerAppListForWebAPIKey from https://partner.steamgames.com/doc/webapi/ISteamApps
	// but it requires a steam api key
	private static _games: SteamApp[] = (steamJson as SteamAppListJsonModel).applist
		.apps as SteamApp[];

	static popularGames: ITopSteamGames = {
		last_update: 0,
		ranks: []
	};

	public static getName(appId: number): string {
		const game = this._games.find((game) => game.appid === appId);
		return game ? game.name : '';
	}

	public static search(query: string) {
		const parsedQuery = query.trim().toLowerCase().replace('-', '');
		return this._games
			.filter((game) => game.name.toLowerCase().replace('-', '').startsWith(parsedQuery))
			.slice(0, 20);
	}
}
