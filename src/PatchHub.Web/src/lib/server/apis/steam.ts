import { env } from '$env/dynamic/private';
import type {
	ISteamAppListResponse,
	ISteamAppNewsResponse,
	ITopSteamGames
} from '$lib/models/Steam';

function getSteamApiUrl(): string {
	const apiUrl = env.STEAM_API_URL || process.env.STEAM_API_URL;
	if (!apiUrl) throw new Error('STEAM_API_URL is not set');
	return apiUrl;
}

export async function popular(): Promise<ITopSteamGames | undefined> {
	const MOST_PLAYED_ROUTE = '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/';
	const url = getSteamApiUrl() + MOST_PLAYED_ROUTE;
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
	const URL = `${getSteamApiUrl()}${NEWS_ROUTE}?${searchParams.toString()}`;
	try {
		const response = await fetch(URL);
		const data = (await response.json()) as ISteamAppNewsResponse;
		return data;
	} catch {
		return undefined;
	}
}

export async function getAppListPage({
	apiKey,
	lastAppId
}: {
	apiKey: string;
	lastAppId?: number;
}): Promise<ISteamAppListResponse | undefined> {
	const APP_LIST_ROUTE = '/IStoreService/GetAppList/v1/';
	const params = new URLSearchParams({
		key: apiKey,
		include_games: 'true'
	});

	if (lastAppId !== undefined && lastAppId > 0) {
		params.set('last_appid', lastAppId.toString());
	}

	try {
		const response = await fetch(`${getSteamApiUrl()}${APP_LIST_ROUTE}?${params.toString()}`);
		if (!response.ok) return undefined;
		const data = (await response.json()) as unknown;
		if (!isSteamAppListResponse(data)) return undefined;
		return data;
	} catch {
		return undefined;
	}
}

function isSteamAppListResponse(value: unknown): value is ISteamAppListResponse {
	if (!value || typeof value !== 'object' || !('response' in value)) return false;
	const response = value.response;
	if (!response || typeof response !== 'object') return false;
	if (!('apps' in response) || !Array.isArray(response.apps)) return false;
	if (!('have_more_results' in response) || typeof response.have_more_results !== 'boolean') {
		return false;
	}
	if (!('last_appid' in response) || typeof response.last_appid !== 'number') return false;

	return response.apps.every((app) => {
		if (!app || typeof app !== 'object') return false;
		return (
			'appid' in app &&
			typeof app.appid === 'number' &&
			'name' in app &&
			typeof app.name === 'string'
		);
	});
}
