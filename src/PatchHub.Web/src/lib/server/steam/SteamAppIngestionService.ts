import { env } from '$env/dynamic/private';
import type { ISteamAppListItem } from '$lib/models/Steam';
import * as steam from '$lib/server/apis/steam';
import { db } from '$lib/server/db';
import { externalItem, externalSyncState } from '$lib/server/db/schema';
import {
	createSteamExternalItemValues,
	getLatestSteamNewsDate,
	STEAM_APP_LIST_SYNC_KIND,
	STEAM_SOURCE
} from '$lib/server/steam/SteamCatalog';
import { and, eq } from 'drizzle-orm';

export type SteamSyncResult = {
	batchesFetched: number;
	appsImported: number;
	finalCursor: number | null;
	haveMoreResults: boolean;
};

export type SteamSyncOptions = {
	maxPages?: number;
	classifyLimit?: number;
	delayMs?: number;
	startCursor?: number;
};

export class SteamAppIngestionService {
	public static async syncAppList(options: SteamSyncOptions = {}): Promise<SteamSyncResult> {
		const apiKey = env.STEAM_API_KEY || process.env.STEAM_API_KEY;
		if (!apiKey) throw new Error('STEAM_API_KEY is not set');

		const maxPages = options.maxPages ?? 1;
		const delayMs = options.delayMs ?? 0;
		let cursor = options.startCursor ?? (await this.getCursor());
		let batchesFetched = 0;
		let appsImported = 0;
		let haveMoreResults = false;

		await this.markSyncStarted(cursor);

		try {
			for (let page = 0; page < maxPages; page++) {
				const response = await steam.getAppListPage({ apiKey, lastAppId: cursor ?? undefined });
				if (!response?.response.apps.length) {
					haveMoreResults = false;
					break;
				}

				await this.upsertApps(response.response.apps);
				batchesFetched++;
				appsImported += response.response.apps.length;
				cursor = response.response.last_appid;
				haveMoreResults = response.response.have_more_results;
				await this.markSyncFinished(cursor, haveMoreResults ? 'partial' : 'complete');

				if (!haveMoreResults) break;
				if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
			}

			if (options.classifyLimit && options.classifyLimit > 0) {
				await this.classifyCandidates(options.classifyLimit);
			}

			return {
				batchesFetched,
				appsImported,
				finalCursor: cursor,
				haveMoreResults
			};
		} catch (error) {
			await this.markSyncFailed(error);
			throw error;
		}
	}

	public static async upsertApps(apps: ISteamAppListItem[]) {
		const now = new Date();

		for (const app of apps) {
			const values = createSteamExternalItemValues(app, now);
			await db
				.insert(externalItem)
				.values(values)
				.onConflictDoUpdate({
					target: [externalItem.type, externalItem.externalId],
					set: {
						name: values.name,
						normalizedName: values.normalizedName,
						source: values.source,
						appType: values.appType,
						slug: values.slug,
						searchName: values.searchName,
						isSearchable: values.isSearchable,
						trackStatus: values.trackStatus,
						metadataJson: values.metadataJson,
						lastSeenAt: now,
						lastSyncedAt: now,
						updatedAt: now
					}
				});
		}
	}

	public static async classifyCandidates(limit: number) {
		const candidates = await db.query.externalItem.findMany({
			where: (items, { and, eq }) =>
				and(eq(items.type, STEAM_SOURCE), eq(items.trackStatus, 'candidate')),
			limit
		});

		for (const candidate of candidates) {
			if (!candidate.externalId) continue;
			const news = await steam.news(candidate.externalId, '5');
			const newsItems = news?.appnews.newsitems ?? [];
			const latestNewsDate = getLatestSteamNewsDate(newsItems);
			const hasNews = newsItems.length > 0;

			await db
				.update(externalItem)
				.set({
					isSearchable: hasNews,
					trackStatus: hasNews ? 'trackable' : 'candidate',
					lastNewsCheckedAt: new Date(),
					lastNewsItemAt: latestNewsDate,
					updatedAt: new Date()
				})
				.where(eq(externalItem.id, candidate.id));
		}
	}

	private static async getCursor(): Promise<number | null> {
		const state = await db.query.externalSyncState.findFirst({
			where: (syncState, { and, eq }) =>
				and(eq(syncState.source, STEAM_SOURCE), eq(syncState.syncKind, STEAM_APP_LIST_SYNC_KIND))
		});

		if (!state?.cursor) return null;
		const parsed = parseInt(state.cursor);
		return Number.isNaN(parsed) ? null : parsed;
	}

	private static async markSyncStarted(cursor: number | null) {
		const now = new Date();
		await db
			.insert(externalSyncState)
			.values({
				source: STEAM_SOURCE,
				syncKind: STEAM_APP_LIST_SYNC_KIND,
				cursor: cursor?.toString() ?? null,
				status: 'running',
				startedAt: now,
				finishedAt: null,
				lastError: null,
				createdAt: now,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: [externalSyncState.source, externalSyncState.syncKind],
				set: {
					status: 'running',
					startedAt: now,
					finishedAt: null,
					lastError: null,
					updatedAt: now
				}
			});
	}

	private static async markSyncFinished(cursor: number | null, status: 'partial' | 'complete') {
		const now = new Date();
		await db
			.update(externalSyncState)
			.set({
				cursor: cursor?.toString() ?? null,
				status,
				finishedAt: now,
				updatedAt: now
			})
			.where(
				and(
					eq(externalSyncState.source, STEAM_SOURCE),
					eq(externalSyncState.syncKind, STEAM_APP_LIST_SYNC_KIND)
				)
			);
	}

	private static async markSyncFailed(error: unknown) {
		const now = new Date();
		const message = error instanceof Error ? error.message : String(error);
		await db
			.update(externalSyncState)
			.set({
				status: 'failed',
				lastError: message,
				finishedAt: now,
				updatedAt: now
			})
			.where(
				and(
					eq(externalSyncState.source, STEAM_SOURCE),
					eq(externalSyncState.syncKind, STEAM_APP_LIST_SYNC_KIND)
				)
			);
	}
}
