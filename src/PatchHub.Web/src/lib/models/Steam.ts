export interface ITopSteamGames {
	last_update: number;
	ranks: IRankedSteamGame[];
}

export interface IRankedSteamGame {
	rank: number;
	appid: number;
	concurrent_in_game: number;
	peak_in_game: number;
	name: string;
}

export interface SteamAppListJsonModel {
	applist: SteamAppList;
}

export interface SteamAppList {
	apps: SteamApp[];
}

export interface SteamApp {
	appid: number;
	name: string;
}
