import type {
	SoftwareSource,
	SoftwareSourceDetail,
	SoftwareSourceSummary,
	SoftwareUpdateEntry
} from '$lib/models/Software';
import { MemoryCache } from '$lib/server/cache/MemoryCache';
import { UPSTREAM_FETCH_OPTIONS, boundedFetch } from '$lib/server/http/boundedFetch';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/catalog';
import { normalizeSoftwareFeedItem } from '$lib/server/software/feed';
import { fetchNvidiaGameReadyDrivers } from '$lib/server/software/nvidia';
import { parseFeed } from '@rowanmanning/feed-parser';

const maximumSourceEntries = 25;
const staleSourceError = 'Source could not be refreshed. Showing cached updates.';
const cache = new MemoryCache();

type CachedSourceEntries = {
	entries: SoftwareUpdateEntry[];
	etag: string | null;
	lastModified: string | null;
};

export async function getSourceDetail(
	slug: string,
	limit = 25,
	fetchFn: typeof fetch = fetch
): Promise<SoftwareSourceDetail | null> {
	const storedSource = await getSoftwareSource(slug);
	if (!storedSource) return null;

	const detail = await loadSourceDetail(storedSource.source, limit, fetchFn);
	return { ...detail, externalItemId: storedSource.externalItemId };
}

async function loadSourceDetail(
	source: SoftwareSource,
	limit: number,
	fetchFn: typeof fetch
): Promise<SoftwareSourceDetail> {
	try {
		const rendering = source.rendering ?? 'excerpt';
		const result = await cache.getOrCreate<CachedSourceEntries>(
			`software:source:${source.slug}:${rendering}`,
			(cached) => fetchSourceEntries(source, fetchFn, cached),
			{ ttlMs: source.cacheTtlMs }
		);

		return {
			source,
			entries: result.value.entries.slice(0, limit),
			health: {
				available: true,
				error: result.servedStale ? staleSourceError : null
			},
			externalItemId: null
		};
	} catch (error) {
		return createUnavailableDetail(source, getErrorMessage(error));
	}
}

export async function getSourceSummaries(
	fetchFn: typeof fetch = fetch
): Promise<SoftwareSourceSummary[]> {
	const storedSources = await getSoftwareSources();

	return Promise.all(
		storedSources.map(async ({ source, externalItemId }) => {
			const detail = await loadSourceDetail(source, 10, fetchFn);

			return {
				source,
				latestUpdate: detail.entries[0] ?? null,
				updateCount: detail.entries.length,
				health: detail.health,
				externalItemId
			};
		})
	);
}

async function fetchSourceEntries(
	source: SoftwareSource,
	fetchFn: typeof fetch,
	cached: CachedSourceEntries | undefined
): Promise<CachedSourceEntries> {
	const result = await fetchEntries(source, fetchFn, cached);
	return {
		...result,
		entries: [...result.entries].sort(compareEntriesByDate).slice(0, maximumSourceEntries)
	};
}

function createUnavailableDetail(source: SoftwareSource, error: string): SoftwareSourceDetail {
	return {
		source,
		entries: [],
		health: {
			available: false,
			error
		},
		externalItemId: null
	};
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown source error';
}

async function fetchEntries(
	source: SoftwareSource,
	fetchFn: typeof fetch,
	cached: CachedSourceEntries | undefined
): Promise<CachedSourceEntries> {
	switch (source.adapter) {
		case 'atom-feed':
			return fetchAtomEntries(source, fetchFn, cached);
		case 'nvidia-driver-search':
			return {
				entries: await fetchNvidiaGameReadyDrivers(source, fetchFn),
				etag: null,
				lastModified: null
			};
	}
}

async function fetchAtomEntries(
	source: SoftwareSource,
	fetchFn: typeof fetch,
	cached: CachedSourceEntries | undefined
): Promise<CachedSourceEntries> {
	const headers = new Headers();
	if (cached?.etag) headers.set('if-none-match', cached.etag);
	if (cached?.lastModified) headers.set('if-modified-since', cached.lastModified);

	const response = await boundedFetch(fetchFn, source.upstreamUrl, {
		...UPSTREAM_FETCH_OPTIONS,
		headers
	});

	if (response.status === 304) {
		if (!cached) throw new Error('Feed returned 304 without a cached response');

		return {
			entries: cached.entries,
			etag: response.headers.get('etag') ?? cached.etag,
			lastModified: response.headers.get('last-modified') ?? cached.lastModified
		};
	}

	if (!response.ok) {
		throw new Error(`Feed returned ${response.status}`);
	}

	const parsed = parseFeed(await response.text());
	return {
		entries: parsed.items.map((item) =>
			normalizeSoftwareFeedItem(
				{
					id: item.id,
					title: item.title,
					url: item.url,
					content: item.content,
					description: item.description,
					published: item.published,
					updated: item.updated,
					authors: item.authors
				},
				source.slug,
				source.rendering ?? 'excerpt'
			)
		),
		etag: response.headers.get('etag'),
		lastModified: response.headers.get('last-modified')
	};
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
