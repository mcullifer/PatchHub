import type {
	SoftwareSourceDetail,
	SoftwareSourceHealth,
	SoftwareSourceSummary,
	SoftwareUpdateEntry
} from '$lib/models/Software';
import {
	normalizeSoftwareFeedItem,
	type FeedItemLike
} from '$lib/server/software/SoftwareFeedNormalizer';
import { fetchNvidiaGameReadyDrivers } from '$lib/server/software/NvidiaDriverSearchAdapter';
import { SoftwareCatalogService } from '$lib/server/software/SoftwareCatalogService';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/SoftwareSourceRegistry';
import { parseFeed } from '@rowanmanning/feed-parser';

type CacheEntry = {
	expiresAt: number;
	detail: SoftwareSourceDetail;
};

const sourceCache = new Map<string, CacheEntry>();

export class SoftwareUpdateService {
	static async getSourceDetail(
		slug: string,
		limit = 25,
		fetchFn: typeof fetch = fetch
	): Promise<SoftwareSourceDetail | null> {
		const source = getSoftwareSource(slug);
		if (!source) return null;

		const cached = sourceCache.get(source.slug);
		if (cached && cached.expiresAt > Date.now()) {
			return {
				...cached.detail,
				entries: cached.detail.entries.slice(0, limit),
				health: {
					...cached.detail.health,
					status: 'cached'
				}
			};
		}

		try {
			const checkedAt = new Date();
			const entries = (await fetchEntries(source, fetchFn)).sort(compareEntriesByDate);
			const latestItemAt = getEntryDate(entries[0]) ?? null;
			const detail: SoftwareSourceDetail = {
				source,
				entries,
				health: {
					status: 'fresh',
					checkedAt: checkedAt.toISOString(),
					latestItemAt: latestItemAt?.toISOString() ?? null,
					error: null
				}
			};

			sourceCache.set(source.slug, {
				expiresAt: Date.now() + source.cacheTtlSeconds * 1000,
				detail
			});

			await SoftwareCatalogService.upsertSource(source.slug);

			return {
				...detail,
				entries: detail.entries.slice(0, limit)
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown source error';
			const stale = sourceCache.get(source.slug);

			if (stale) {
				return {
					...stale.detail,
					entries: stale.detail.entries.slice(0, limit),
					health: {
						...stale.detail.health,
						status: 'cached',
						error: message
					}
				};
			}

			return {
				source,
				entries: [],
				health: {
					status: 'unavailable',
					checkedAt: new Date().toISOString(),
					latestItemAt: null,
					error: message
				}
			};
		}
	}

	static async getSourceSummaries(
		limit = 6,
		fetchFn: typeof fetch = fetch
	): Promise<SoftwareSourceSummary[]> {
		const sources = getSoftwareSources().slice(0, limit);

		return Promise.all(
			sources.map(async (source) => {
				const [detail, externalItemId] = await Promise.all([
					this.getSourceDetail(source.slug, 10, fetchFn),
					SoftwareCatalogService.getExternalItemId(source.slug)
				]);

				return {
					source,
					latestUpdate: detail?.entries[0] ?? null,
					updateCount: detail?.entries.length ?? 0,
					health: detail?.health ?? createUnavailableHealth(),
					externalItemId
				};
			})
		);
	}
}

async function fetchEntries(
	source: NonNullable<ReturnType<typeof getSoftwareSource>>,
	fetchFn: typeof fetch
): Promise<SoftwareUpdateEntry[]> {
	switch (source.adapter) {
		case 'atom-feed':
			return fetchAtomEntries(source.feedUrl, source.slug, fetchFn);
		case 'nvidia-driver-search':
			return fetchNvidiaGameReadyDrivers(source, fetchFn);
	}
}

async function fetchAtomEntries(feedUrl: string | null, sourceSlug: string, fetchFn: typeof fetch) {
	if (!feedUrl) {
		throw new Error('Atom source is missing a feed URL');
	}

	const response = await fetchFn(feedUrl, {
		headers: {
			accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml'
		}
	});

	if (!response.ok) {
		throw new Error(`Feed returned ${response.status}`);
	}

	const parsed = parseFeed(await response.text());
	return parsed.items.map((item) => normalizeSoftwareFeedItem(item as FeedItemLike, sourceSlug));
}

function compareEntriesByDate(a: SoftwareUpdateEntry, b: SoftwareUpdateEntry): number {
	return (getEntryDate(b)?.getTime() ?? 0) - (getEntryDate(a)?.getTime() ?? 0);
}

function getEntryDate(entry: SoftwareUpdateEntry | undefined): Date | null {
	if (!entry) return null;

	const value = entry.publishedAt ?? entry.updatedAt;
	if (!value) return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date;
}

function createUnavailableHealth(): SoftwareSourceHealth {
	return {
		status: 'unavailable',
		checkedAt: null,
		latestItemAt: null,
		error: 'Source could not be loaded'
	};
}
