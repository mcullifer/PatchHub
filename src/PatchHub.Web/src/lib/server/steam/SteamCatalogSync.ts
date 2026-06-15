import type { ISteamAppListItem, ISteamAppListResponse } from '$lib/models/Steam';
import { getAppListPage } from './SteamApiClient';
import {
	DEFAULT_STEAM_APP_IMPORT_BATCH_SIZE,
	getSteamAppListCursor,
	importSteamAppListPage,
	markSteamAppListSyncFailed,
	markSteamAppListSyncFinished,
	markSteamAppListSyncStarted
} from './SteamCatalogRepository';

export type SteamSyncResult = {
	batchesFetched: number;
	appsImported: number;
	finalCursor: number | null;
	haveMoreResults: boolean;
};

export type SteamSyncOptions = {
	maxPages?: number;
	delayMs?: number;
	startCursor?: number;
	batchSize?: number;
	apiBaseUrl?: string;
	apiKey?: string;
	fetchFn?: typeof fetch;
};

export type SteamCatalogSyncDependencies = {
	getCursor?: () => Promise<number | null>;
	markStarted?: (cursor: number | null) => Promise<void>;
	fetchAppListPage?: (cursor: number | null) => Promise<ISteamAppListResponse>;
	importAppListPage?: (page: {
		apps: ISteamAppListItem[];
		cursor: number | null;
		status: 'partial' | 'complete';
		batchSize: number;
	}) => Promise<number>;
	markFinished?: (cursor: number | null, status: 'partial' | 'complete') => Promise<void>;
	markFailed?: (error: unknown) => Promise<void>;
	wait?: (delayMs: number) => Promise<void>;
};

export async function syncSteamCatalog(
	options: SteamSyncOptions = {},
	dependencies: SteamCatalogSyncDependencies = {}
): Promise<SteamSyncResult> {
	const maxPages = options.maxPages;
	const delayMs = options.delayMs ?? 0;
	const batchSize = options.batchSize ?? DEFAULT_STEAM_APP_IMPORT_BATCH_SIZE;
	const getCursor = dependencies.getCursor ?? getSteamAppListCursor;
	const markStarted = dependencies.markStarted ?? markSteamAppListSyncStarted;
	const markFailed = dependencies.markFailed ?? markSteamAppListSyncFailed;
	const markFinished = dependencies.markFinished ?? markSteamAppListSyncFinished;
	const importPage =
		dependencies.importAppListPage ??
		((page) =>
			importSteamAppListPage({
				apps: page.apps,
				cursor: page.cursor,
				status: page.status,
				batchSize: page.batchSize
			}));
	const fetchPage =
		dependencies.fetchAppListPage ??
		((cursor) =>
			getAppListPage({
				apiKey: getSteamApiKey(options.apiKey),
				lastAppId: cursor ?? undefined,
				apiBaseUrl: options.apiBaseUrl,
				fetchFn: options.fetchFn
			}));
	const wait = dependencies.wait ?? sleep;

	let cursor = options.startCursor ?? (await getCursor());
	let batchesFetched = 0;
	let appsImported = 0;
	let haveMoreResults = false;

	await markStarted(cursor);

	try {
		for (let page = 0; maxPages === undefined || page < maxPages; page++) {
			const response = await fetchPage(cursor);
			const pageApps = response.response.apps;

			if (pageApps.length === 0) {
				haveMoreResults = false;
				await markFinished(cursor, 'complete');
				break;
			}

			const nextCursor = response.response.last_appid;
			haveMoreResults = response.response.have_more_results;
			const status = haveMoreResults ? 'partial' : 'complete';

			const importedCount = await importPage({
				apps: pageApps,
				cursor: nextCursor,
				status,
				batchSize
			});

			batchesFetched++;
			appsImported += importedCount;
			cursor = nextCursor;

			if (!haveMoreResults) break;
			if (delayMs > 0) await wait(delayMs);
		}

		return {
			batchesFetched,
			appsImported,
			finalCursor: cursor,
			haveMoreResults
		};
	} catch (error) {
		await markFailed(error);
		throw error;
	}
}

function getSteamApiKey(apiKey: string | undefined): string {
	const configuredApiKey = apiKey || process.env.STEAM_API_KEY;
	if (!configuredApiKey) throw new Error('STEAM_API_KEY is not set');
	return configuredApiKey;
}

function sleep(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}
