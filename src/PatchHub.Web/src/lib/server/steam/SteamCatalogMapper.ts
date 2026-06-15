import type { ISteamAppListItem } from '$lib/models/Steam';
import { createSlug, normalizeName, normalizeSearchName } from '$lib/util/StringUtils';
import { STEAM_SOURCE } from './SteamCatalogTypes';

export function createSteamExternalItemValues(app: ISteamAppListItem, now = new Date()) {
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
		createdAt: now,
		updatedAt: now
	};
}
