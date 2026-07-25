import { env } from '$env/dynamic/private';
import type { ISteamAppNewsResponse, ITopSteamGames } from '$lib/models/Steam';
import { UPSTREAM_FETCH_OPTIONS, boundedFetch } from '$lib/server/http/boundedFetch';

export const DEFAULT_NEWS_COUNT = 10;

type GameNewsOptions = {
	appId: number;
	count?: number;
	fetchFn: typeof fetch;
};

export async function fetchPopularGames(fetchFn: typeof fetch) {
	const url = buildApiUrl('/ISteamChartsService/GetGamesByConcurrentPlayers/v1/');
	const data = await fetchJson<{ response: ITopSteamGames }>(fetchFn, url, 'popular games');
	return data.response;
}

export async function fetchGameNews({
	appId,
	count = DEFAULT_NEWS_COUNT,
	fetchFn
}: GameNewsOptions) {
	const params = new URLSearchParams({
		appid: appId.toString(),
		count: count.toString(),
		feeds: 'steam_community_announcements'
	});
	const url = buildApiUrl('/ISteamNews/GetNewsForApp/v2/', params);
	return fetchJson<ISteamAppNewsResponse>(fetchFn, url, `news for Steam app ${appId}`);
}

function buildApiUrl(route: string, params?: URLSearchParams) {
	if (!env.STEAM_API_URL) {
		throw new Error('STEAM_API_URL is not set');
	}

	const baseUrl = env.STEAM_API_URL.replace(/\/+$/, '');
	const query = params ? `?${params.toString()}` : '';
	return `${baseUrl}${route}${query}`;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string, context: string) {
	const response = await boundedFetch(fetchFn, url, UPSTREAM_FETCH_OPTIONS);
	if (!response.ok) {
		throw new Error(`Steam ${context} request failed with HTTP ${response.status}`);
	}

	return (await response.json()) as T;
}
