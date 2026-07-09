import { createSlug, normalizeName, normalizeSearchName } from './strings';

export const STEAM_SOURCE = 'steam';

export type SteamAppListItem = {
	appid: number;
	name: string;
	last_modified?: number;
	price_change_number?: number;
};

export type SteamAppListPage = {
	apps: SteamAppListItem[];
	haveMoreResults: boolean;
	lastAppId: number | null;
};

export function createSteamExternalItemValues(app: SteamAppListItem, now: number) {
	const externalId = app.appid.toString();

	return {
		name: app.name,
		normalizedName: normalizeName(app.name) || externalId,
		type: STEAM_SOURCE,
		externalId,
		source: 'steam_api',
		appType: 'game',
		slug: createSlug(app.name, externalId),
		searchName: normalizeSearchName(app.name) || externalId,
		metadataJson: JSON.stringify({
			lastModified: app.last_modified,
			priceChangeNumber: app.price_change_number
		}),
		updatedAt: now
	};
}

const STEAM_API_BASE_URL = 'https://api.steampowered.com';

export async function fetchSteamAppListPage({
	apiKey,
	lastAppId,
	maxResults,
	fetchFn = fetch
}: {
	apiKey: string;
	lastAppId?: number | null;
	maxResults?: number;
	fetchFn?: typeof fetch;
}): Promise<SteamAppListPage> {
	const params = new URLSearchParams({
		key: apiKey,
		include_games: 'true'
	});

	if (lastAppId !== undefined && lastAppId !== null && lastAppId > 0) {
		params.set('last_appid', lastAppId.toString());
	}

	if (maxResults !== undefined && maxResults > 0) {
		params.set('max_results', maxResults.toString());
	}

	const url = `${STEAM_API_BASE_URL}/IStoreService/GetAppList/v1/?${params.toString()}`;
	const response = await fetchFn(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) {
		throw new Error(`Steam app list request failed with status ${response.status}`);
	}

	const data = await response.json();
	if (!isSteamAppListResponse(data)) {
		throw new Error('Steam app list response had an unexpected shape');
	}

	const apps = data.response.apps ?? [];

	return {
		apps,
		haveMoreResults: data.response.have_more_results ?? false,
		lastAppId: data.response.last_appid ?? apps.at(-1)?.appid ?? lastAppId ?? null
	};
}

type RawSteamAppListResponse = {
	response: {
		apps?: SteamAppListItem[];
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
	return apps.every(isSteamAppListItem);
}

function isSteamAppListItem(value: unknown): value is SteamAppListItem {
	if (!value || typeof value !== 'object') return false;

	const hasRequiredFields =
		'appid' in value &&
		typeof value.appid === 'number' &&
		'name' in value &&
		typeof value.name === 'string';
	const hasValidLastModified =
		!('last_modified' in value) || typeof value.last_modified === 'number';
	const hasValidPriceChangeNumber =
		!('price_change_number' in value) || typeof value.price_change_number === 'number';

	return hasRequiredFields && hasValidLastModified && hasValidPriceChangeNumber;
}
