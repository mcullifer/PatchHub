import { v, type Infer } from 'convex/values';
import type { ExternalItemValues } from './externalItems';
import { createSlug } from './strings';

export const STEAM_SOURCE = 'steam';

export const steamAppValidator = v.object({
	appid: v.number(),
	name: v.string(),
	last_modified: v.optional(v.number()),
	price_change_number: v.optional(v.number())
});
export type SteamAppListItem = Infer<typeof steamAppValidator>;

export type SteamAppListPage = {
	apps: SteamAppListItem[];
	haveMoreResults: boolean;
	lastAppId: number | null;
};

export function createSteamExternalItemValues(
	app: SteamAppListItem,
	now: number
): ExternalItemValues {
	const externalId = app.appid.toString();

	return {
		name: app.name,
		type: STEAM_SOURCE,
		externalId,
		slug: createSlug(app.name, externalId),
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

	const data: unknown = await response.json();
	if (!isSteamAppListResponse(data)) {
		throw new Error('Steam app list response had an unexpected shape');
	}

	// Skip individual malformed rows so one bad record cannot sink a whole
	// page; only a wholesale shape change rejects the response.
	const apps = (data.response.apps ?? []).filter(isSteamAppListItem);

	return {
		apps,
		haveMoreResults: data.response.have_more_results ?? false,
		lastAppId: data.response.last_appid ?? apps.at(-1)?.appid ?? lastAppId ?? null
	};
}

type RawSteamAppListResponse = {
	response: {
		apps?: unknown[];
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
	return !('last_appid' in response) || isValidAppId(response.last_appid);
}

// App ids feed the sync cursor, so anything but a positive safe integer
// (fractions, negatives, JSON-parsable Infinity) is rejected at the boundary.
function isValidAppId(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isSteamAppListItem(value: unknown): value is SteamAppListItem {
	if (!value || typeof value !== 'object') return false;

	const hasRequiredFields =
		'appid' in value &&
		isValidAppId(value.appid) &&
		'name' in value &&
		typeof value.name === 'string';
	const hasValidLastModified =
		!('last_modified' in value) || typeof value.last_modified === 'number';
	const hasValidPriceChangeNumber =
		!('price_change_number' in value) || typeof value.price_change_number === 'number';

	return hasRequiredFields && hasValidLastModified && hasValidPriceChangeNumber;
}
