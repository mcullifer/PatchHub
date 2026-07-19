export interface ITopSteamGames {
	last_update: number;
	ranks: IRankedSteamGame[];
}
// TODO: We don't want to do this we actually wnt to return the catalog type
// then extend it with the IRankedSteamGame data in another field
// we need the actual catalog items so we have the catalog id for user favorites

export interface INamedSteamGame extends IRankedSteamGame {
	name: string;
	slug?: string;
	externalItemId?: string | null;
}

export interface IRankedSteamGame {
	rank: number;
	appid: number;
	concurrent_in_game: number;
	peak_in_game: number;
}

export interface ISteamAppListJsonModel {
	applist: ISteamAppList;
}

export interface ISteamAppList {
	apps: ISteamApp[];
}

export interface ISteamApp {
	appid: number;
	name: string;
	slug?: string;
}

export interface ISteamAppNewsResponse {
	appnews: ISteamAppNews;
}

export interface ISteamAppNews {
	appid: number;
	count: number;
	newsitems: ISteamNewsItem[];
}

export interface ISteamNewsItem {
	appid: number;
	author: string;
	contents: string;
	date: number;
	feed_type: number;
	feedlabel: string;
	feedname: string;
	gid: string;
	is_external_url: true;
	tags: string[];
	title: string;
	url: string;
}

export interface ISteamAppListResponse {
	response: ISteamAppListResponseBody;
}

export interface ISteamAppListResponseBody {
	apps: ISteamAppListItem[];
	have_more_results: boolean;
	last_appid: number;
}

export interface ISteamAppListItem {
	appid: number;
	name: string;
	last_modified?: number;
	price_change_number?: number;
}
