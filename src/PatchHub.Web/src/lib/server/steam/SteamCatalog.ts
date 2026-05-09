import type { ISteamAppListItem, ISteamNewsItem } from '$lib/models/Steam';
import { createSlug, normalizeName, normalizeSearchName } from '$lib/util/StringUtils';

export const STEAM_SOURCE = 'steam';
export const STEAM_APP_LIST_SYNC_KIND = 'steam-app-list';

export type SteamTrackStatus = 'candidate' | 'trackable' | 'not_trackable' | 'needs_review';

const excludedNamePatterns = [
	/\bdlc\b/i,
	/\bsoundtrack\b/i,
	/\bdemo\b/i,
	/\bdedicated server\b/i,
	/\bserver\b/i,
	/\btool\b/i,
	/\btrailer\b/i,
	/\bart\s?book\b/i,
	/\bbonus content\b/i,
	/\bplaytest\b/i,
	/\bmodding kit\b/i
];

export function isProbablySearchableSteamGame(name: string): boolean {
	const trimmed = name.trim();
	return trimmed.length > 0 && !excludedNamePatterns.some((pattern) => pattern.test(trimmed));
}

export function createSteamExternalItemValues(app: ISteamAppListItem, now = new Date()) {
	const externalId = app.appid.toString();
	const searchable = isProbablySearchableSteamGame(app.name);

	return {
		name: app.name,
		normalizedName: normalizeName(app.name) || externalId,
		type: STEAM_SOURCE,
		externalId,
		source: 'steam_api',
		appType: 'game',
		slug: createSlug(app.name, externalId),
		searchName: normalizeSearchName(app.name) || externalId,
		isSearchable: searchable,
		trackStatus: (searchable ? 'candidate' : 'not_trackable') satisfies SteamTrackStatus,
		metadataJson: JSON.stringify({
			lastModified: app.last_modified,
			priceChangeNumber: app.price_change_number
		}),
		firstSeenAt: now,
		lastSeenAt: now,
		lastSyncedAt: now,
		createdAt: now,
		updatedAt: now
	};
}

export function getLatestSteamNewsDate(newsItems: ISteamNewsItem[]): Date | null {
	const latestTimestamp = newsItems.reduce((latest, item) => Math.max(latest, item.date), 0);
	return latestTimestamp > 0 ? new Date(latestTimestamp * 1000) : null;
}
