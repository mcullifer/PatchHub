import { STEAM_API_URL } from '$env/static/private';
import type { ISteamAppNewsResponse, ITopSteamGames } from '$lib/models/Steam';

export async function popular(): Promise<ITopSteamGames | undefined> {
	const MOST_PLAYED_ROUTE = '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/';
	const url = STEAM_API_URL + MOST_PLAYED_ROUTE;
	try {
		const response = await fetch(url);
		const responseJson = await response.json();
		const rankedGames = responseJson.response as ITopSteamGames;
		return rankedGames;
	} catch {
		return undefined;
	}
}

export async function news(
	appid: string,
	count: string = '10'
): Promise<ISteamAppNewsResponse | undefined> {
	const NEWS_ROUTE = '/ISteamNews/GetNewsForApp/v2/';
	const params: Record<string, string> = {
		appid: appid,
		count: count,
		feeds: 'steam_community_announcements'
	};
	const searchParams = new URLSearchParams(params);
	const URL = `${STEAM_API_URL}${NEWS_ROUTE}?${searchParams.toString()}`;
	try {
		const response = await fetch(URL);
		const data = (await response.json()) as ISteamAppNewsResponse;
		return data;
	} catch {
		return undefined;
	}
}
