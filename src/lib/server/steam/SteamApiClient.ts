import { env } from '$env/dynamic/private';
import type {
	ISteamAppListResponse,
	ISteamAppNewsResponse,
	ISteamNewsItem,
	ITopSteamGames
} from '$lib/models/Steam';

export type SteamApiErrorCode =
	'missing_configuration' | 'http_error' | 'invalid_response' | 'network_error';

export class SteamApiError extends Error {
	public readonly code: SteamApiErrorCode;
	public readonly status?: number;
	public readonly cause?: unknown;

	public constructor(
		message: string,
		options: { code: SteamApiErrorCode; status?: number; cause?: unknown }
	) {
		super(message);
		this.name = 'SteamApiError';
		this.code = options.code;
		this.status = options.status;
		this.cause = options.cause;
	}
}

type SteamFetchOptions = {
	apiBaseUrl?: string;
	fetchFn?: typeof fetch;
};

export async function getPopularSteamGames({
	apiBaseUrl,
	fetchFn = fetch
}: SteamFetchOptions = {}): Promise<ITopSteamGames> {
	const url = buildSteamApiUrl(apiBaseUrl, '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/');
	const data = await fetchSteamJson(url, fetchFn, 'popular games');

	if (!isPopularSteamGamesResponse(data)) {
		throw new SteamApiError('Steam popular games response had an unexpected shape', {
			code: 'invalid_response'
		});
	}

	return data.response;
}

export async function getAppNews({
	appid,
	count = 10,
	apiBaseUrl,
	fetchFn = fetch
}: SteamFetchOptions & {
	appid: string;
	count?: number;
}): Promise<ISteamAppNewsResponse> {
	const params = new URLSearchParams({
		appid,
		count: count.toString(),
		feeds: 'steam_community_announcements'
	});
	const url = buildSteamApiUrl(apiBaseUrl, '/ISteamNews/GetNewsForApp/v2/', params);
	const data = await fetchSteamJson(url, fetchFn, `news for Steam app ${appid}`);

	if (!isSteamAppNewsResponse(data)) {
		throw new SteamApiError(`Steam news response for app ${appid} had an unexpected shape`, {
			code: 'invalid_response'
		});
	}

	return data;
}

export async function getAppListPage({
	apiKey,
	lastAppId,
	maxResults,
	ifModifiedSince,
	apiBaseUrl,
	fetchFn = fetch
}: SteamFetchOptions & {
	apiKey: string;
	lastAppId?: number;
	maxResults?: number;
	ifModifiedSince?: number;
}): Promise<ISteamAppListResponse> {
	const params = new URLSearchParams({
		key: apiKey,
		include_games: 'true'
	});

	if (lastAppId !== undefined && lastAppId > 0) {
		params.set('last_appid', lastAppId.toString());
	}

	if (maxResults !== undefined && maxResults > 0) {
		params.set('max_results', maxResults.toString());
	}

	if (ifModifiedSince !== undefined && ifModifiedSince > 0) {
		params.set('if_modified_since', ifModifiedSince.toString());
	}

	const url = buildSteamApiUrl(apiBaseUrl, '/IStoreService/GetAppList/v1/', params);
	const data = await fetchSteamJson(url, fetchFn, 'app list page');

	if (!isSteamAppListResponse(data)) {
		throw new SteamApiError('Steam app list response had an unexpected shape', {
			code: 'invalid_response'
		});
	}

	const apps = data.response.apps ?? [];
	return {
		response: {
			apps,
			have_more_results: data.response.have_more_results ?? false,
			last_appid: data.response.last_appid ?? apps.at(-1)?.appid ?? lastAppId ?? 0
		}
	};
}

function buildSteamApiUrl(apiBaseUrl: string | undefined, route: string, params?: URLSearchParams) {
	const baseUrl = getSteamApiBaseUrl(apiBaseUrl);
	const query = params ? `?${params.toString()}` : '';
	return `${baseUrl}${route}${query}`;
}

function getSteamApiBaseUrl(apiBaseUrl: string | undefined): string {
	const configuredUrl = apiBaseUrl || env.STEAM_API_URL;
	if (!configuredUrl) {
		throw new SteamApiError('STEAM_API_URL is not set', { code: 'missing_configuration' });
	}

	return configuredUrl.replace(/\/+$/, '');
}

async function fetchSteamJson(
	url: string,
	fetchFn: typeof fetch,
	context: string
): Promise<unknown> {
	let response: Response;
	try {
		response = await fetchFn(url);
	} catch (error) {
		throw new SteamApiError(`Steam ${context} request failed`, {
			code: 'network_error',
			cause: error
		});
	}

	if (!response.ok) {
		throw new SteamApiError(`Steam ${context} request failed with HTTP ${response.status}`, {
			code: 'http_error',
			status: response.status
		});
	}

	try {
		return await response.json();
	} catch (error) {
		throw new SteamApiError(`Steam ${context} response was not valid JSON`, {
			code: 'invalid_response',
			cause: error
		});
	}
}

function isPopularSteamGamesResponse(value: unknown): value is { response: ITopSteamGames } {
	if (!value || typeof value !== 'object' || !('response' in value)) return false;
	const response = value.response;
	if (!response || typeof response !== 'object') return false;

	if (!('last_update' in response) || typeof response.last_update !== 'number') return false;
	if (!('ranks' in response) || !Array.isArray(response.ranks)) return false;

	return response.ranks.every((game) => {
		if (!game || typeof game !== 'object') return false;
		return (
			'rank' in game &&
			typeof game.rank === 'number' &&
			'appid' in game &&
			typeof game.appid === 'number' &&
			'concurrent_in_game' in game &&
			typeof game.concurrent_in_game === 'number' &&
			'peak_in_game' in game &&
			typeof game.peak_in_game === 'number'
		);
	});
}

function isSteamAppNewsResponse(value: unknown): value is ISteamAppNewsResponse {
	if (!value || typeof value !== 'object' || !('appnews' in value)) return false;
	const appnews = value.appnews;
	if (!appnews || typeof appnews !== 'object') return false;

	return (
		'appid' in appnews &&
		typeof appnews.appid === 'number' &&
		'count' in appnews &&
		typeof appnews.count === 'number' &&
		'newsitems' in appnews &&
		Array.isArray(appnews.newsitems) &&
		appnews.newsitems.every(isSteamNewsItem)
	);
}

function isSteamNewsItem(value: unknown): value is ISteamNewsItem {
	if (!value || typeof value !== 'object') return false;
	return 'date' in value && typeof value.date === 'number';
}

type RawSteamAppListResponse = {
	response: {
		apps?: ISteamAppListResponse['response']['apps'];
		have_more_results?: boolean;
		last_appid?: number;
	};
};

function isSteamAppListResponse(value: unknown): value is RawSteamAppListResponse {
	if (!value || typeof value !== 'object' || !('response' in value)) return false;
	const response = value.response;
	if (!response || typeof response !== 'object') return false;
	if ('apps' in response && !Array.isArray(response.apps)) return false;
	if ('have_more_results' in response && typeof response.have_more_results !== 'boolean') {
		return false;
	}
	if ('last_appid' in response && typeof response.last_appid !== 'number') return false;

	const apps = 'apps' in response && Array.isArray(response.apps) ? response.apps : [];

	return apps.every((app: unknown) => {
		if (!app || typeof app !== 'object') return false;
		const hasRequiredFields =
			'appid' in app &&
			typeof app.appid === 'number' &&
			'name' in app &&
			typeof app.name === 'string';
		const hasValidLastModified = !('last_modified' in app) || typeof app.last_modified === 'number';
		const hasValidPriceChangeNumber =
			!('price_change_number' in app) || typeof app.price_change_number === 'number';

		return hasRequiredFields && hasValidLastModified && hasValidPriceChangeNumber;
	});
}
