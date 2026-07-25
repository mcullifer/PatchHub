import type {
	SoftwareSource,
	SoftwareSourceDetail,
	SoftwareSourceSummary,
	SoftwareUpdateEntry
} from '$lib/models/Software';
import { MemoryCache } from '$lib/server/cache/MemoryCache';
import { UPSTREAM_FETCH_OPTIONS, boundedFetch } from '$lib/server/http/boundedFetch';
import { ensureExternalItemId } from '$lib/server/software/catalog';
import { normalizeSoftwareFeedItem } from '$lib/server/software/feed';
import { fetchNvidiaGameReadyDrivers } from '$lib/server/software/nvidia';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/sources';
import { parseFeed } from '@rowanmanning/feed-parser';

const maximumSourceEntries = 25;
const staleSourceError = 'Source could not be refreshed. Showing cached updates.';
const cache = new MemoryCache();

export async function getSourceDetail(
	slug: string,
	limit = 25,
	fetchFn: typeof fetch = fetch
): Promise<SoftwareSourceDetail | null> {
	const source = getSoftwareSource(slug);
	if (!source) return null;

	return loadSourceDetail(source, limit, fetchFn);
}

async function loadSourceDetail(
	source: SoftwareSource,
	limit: number,
	fetchFn: typeof fetch
): Promise<SoftwareSourceDetail> {
	try {
		const result = await cache.getOrCreate(
			`software:source:${source.slug}`,
			() => fetchSourceEntries(source, fetchFn),
			{ ttlMs: source.cacheTtlMs }
		);

		return {
			source,
			entries: result.value.slice(0, limit),
			health: {
				available: true,
				error: result.servedStale ? staleSourceError : null
			}
		};
	} catch (error) {
		return createUnavailableDetail(source, getErrorMessage(error));
	}
}

export async function getSourceSummaries(
	limit = 6,
	fetchFn: typeof fetch = fetch
): Promise<SoftwareSourceSummary[]> {
	const sources = getSoftwareSources().slice(0, limit);

	return Promise.all(
		sources.map(async (source) => {
			const [detail, externalItemId] = await Promise.all([
				loadSourceDetail(source, 10, fetchFn),
				ensureExternalItemId(source).catch(() => null)
			]);

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
	fetchFn: typeof fetch
): Promise<SoftwareUpdateEntry[]> {
	return (await fetchEntries(source, fetchFn))
		.sort(compareEntriesByDate)
		.slice(0, maximumSourceEntries);
}

function createUnavailableDetail(source: SoftwareSource, error: string): SoftwareSourceDetail {
	return {
		source,
		entries: [],
		health: {
			available: false,
			error
		}
	};
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown source error';
}

async function fetchEntries(
	source: SoftwareSource,
	fetchFn: typeof fetch
): Promise<SoftwareUpdateEntry[]> {
	switch (source.adapter) {
		case 'atom-feed':
			return fetchAtomEntries(source, fetchFn);
		case 'nvidia-driver-search':
			return fetchNvidiaGameReadyDrivers(source, fetchFn);
	}
}

async function fetchAtomEntries(source: SoftwareSource, fetchFn: typeof fetch) {
	const response = await boundedFetch(fetchFn, source.upstreamUrl, UPSTREAM_FETCH_OPTIONS);

	if (!response.ok) {
		throw new Error(`Feed returned ${response.status}`);
	}

	const parsed = parseFeed(await response.text());
	return parsed.items.map((item) =>
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
			source.rendering
		)
	);
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
