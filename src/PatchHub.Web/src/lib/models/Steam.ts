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

export interface ISteamAppListJsonModel {
	applist: ISteamAppList;
}

export interface ISteamAppList {
	apps: ISteamApp[];
}

export interface ISteamApp {
	appid: number;
	name: string;
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
	last_modified: number;
	price_change_number: number;
}
