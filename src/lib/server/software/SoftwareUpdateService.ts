import type {
	SoftwareSource,
	SoftwareSourceDetail,
	SoftwareSourceHealth,
	SoftwareSourceSummary,
	SoftwareUpdateEntry
} from '$lib/models/Software';
import { normalizeSoftwareFeedItem } from '$lib/server/software/SoftwareFeedNormalizer';
import { fetchNvidiaGameReadyDrivers } from '$lib/server/software/NvidiaDriverSearchAdapter';
import { SoftwareCatalogService } from '$lib/server/software/SoftwareCatalogService';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/SoftwareSourceRegistry';
import { ConvexCache } from '$lib/server/cache/ConvexCache';
import { UPSTREAM_FETCH_OPTIONS, boundedFetch } from '$lib/server/http/boundedFetch';
import { parseFeed } from '@rowanmanning/feed-parser';

const maximumSourceEntries = 25;
export class SoftwareUpdateService {
	static async getSourceDetail(
		slug: string,
		limit = 25,
		fetchFn: typeof fetch = fetch
	): Promise<SoftwareSourceDetail | null> {
		const source = getSoftwareSource(slug);
		if (!source) return null;

		let fetchedFromUpstream = false;
		let upstreamError: string | null = null;
		try {
			const result = await new ConvexCache().getOrCreate(
				`software:source:${source.slug}`,
				async () => {
					try {
						const detail = await fetchSourceDetail(source, fetchFn);
						fetchedFromUpstream = true;
						return detail;
					} catch (error) {
						upstreamError = getErrorMessage(error);
						throw error;
					}
				},
				{ ttlMs: source.cacheTtlMs }
			);
			if (!result) return createUnavailableDetail(source, 'Source could not be loaded');

			if (fetchedFromUpstream) {
				try {
					await SoftwareCatalogService.upsertSource(source.slug);
				} catch (error) {
					return presentDetail(result.value, source, limit, true, getErrorMessage(error));
				}
			}

			return presentDetail(
				result.value,
				source,
				limit,
				result.servedStale || !fetchedFromUpstream,
				upstreamError
			);
		} catch (error) {
			return createUnavailableDetail(source, getErrorMessage(error));
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

async function fetchSourceDetail(
	source: NonNullable<ReturnType<typeof getSoftwareSource>>,
	fetchFn: typeof fetch
): Promise<SoftwareSourceDetail> {
	const checkedAt = new Date();
	const entries = (await fetchEntries(source, fetchFn))
		.sort(compareEntriesByDate)
		.slice(0, maximumSourceEntries);
	const latestItemAt = getEntryDate(entries[0]) ?? null;
	return {
		source,
		entries,
		health: {
			status: 'fresh',
			checkedAt: checkedAt.toISOString(),
			latestItemAt: latestItemAt?.toISOString() ?? null,
			error: null
		}
	};
}

function presentDetail(
	detail: SoftwareSourceDetail,
	source: SoftwareSource,
	limit: number,
	servedFromCache: boolean,
	error: string | null
): SoftwareSourceDetail {
	return {
		...detail,
		source,
		entries: applyRenderingPolicy(source, detail.entries.slice(0, limit)),
		health: {
			...detail.health,
			status: servedFromCache ? 'cached' : 'fresh',
			error: error ?? detail.health.error
		}
	};
}

function createUnavailableDetail(
	source: NonNullable<ReturnType<typeof getSoftwareSource>>,
	error: string
): SoftwareSourceDetail {
	return {
		source,
		entries: [],
		health: {
			status: 'unavailable',
			checkedAt: new Date().toISOString(),
			latestItemAt: null,
			error
		}
	};
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown source error';
}

async function fetchEntries(
	source: NonNullable<ReturnType<typeof getSoftwareSource>>,
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
	if (!source.feedUrl) {
		throw new Error('Atom source is missing a feed URL');
	}

	const response = await boundedFetch(fetchFn, source.feedUrl, UPSTREAM_FETCH_OPTIONS);

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

function applyRenderingPolicy(
	source: SoftwareSource,
	entries: SoftwareUpdateEntry[]
): SoftwareUpdateEntry[] {
	if (source.rendering === 'full') return entries;
	return entries.map((entry) => ({ ...entry, contentHtml: null }));
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
