import type { INamedSteamGame, ISteamApp, ISteamAppListItem } from '$lib/models/Steam';
import { db } from '$lib/server/db';
import { externalItem, steamCatalogSyncState } from '$lib/server/db/schema';
import { getSearchTokens, normalizeSearchName } from '$lib/util/StringUtils';
import { and, asc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { createSteamExternalItemValues } from './SteamCatalogMapper';
import { STEAM_SOURCE } from './SteamCatalogTypes';

export const DEFAULT_STEAM_APP_IMPORT_BATCH_SIZE = 50;
const STEAM_CATALOG_SYNC_STATE_ID = 1;

export type SteamCatalogDatabase = typeof db;
type SteamCatalogTransaction = Parameters<Parameters<SteamCatalogDatabase['transaction']>[0]>[0];
type SteamCatalogExecutor = SteamCatalogDatabase | SteamCatalogTransaction;

export async function findSteamAppByAppId(appId: number, database: SteamCatalogDatabase = db) {
	return await database.query.externalItem.findFirst({
		where: (items, { and, eq }) =>
			and(eq(items.externalId, appId.toString()), eq(items.type, STEAM_SOURCE))
	});
}

export async function getSteamAppsByExternalId(
	appIds: number[],
	database: SteamCatalogDatabase = db
) {
	if (appIds.length === 0) return [];

	return await database.query.externalItem.findMany({
		where: (items, { and, inArray, eq }) =>
			and(
				inArray(
					items.externalId,
					appIds.map((appId) => appId.toString())
				),
				eq(items.type, STEAM_SOURCE)
			)
	});
}

export async function getSteamAppNamesByAppIds(
	appIds: number[],
	database: SteamCatalogDatabase = db
): Promise<Record<string, { name: string; slug: string }>> {
	if (appIds.length === 0) return {};

	const result = await database
		.select({
			appid: externalItem.externalId,
			name: externalItem.name,
			slug: externalItem.slug
		})
		.from(externalItem)
		.where(
			and(
				inArray(
					externalItem.externalId,
					appIds.map((appId) => appId.toString())
				),
				isNotNull(externalItem.externalId),
				eq(externalItem.type, STEAM_SOURCE)
			)
		);

	const appNames: Record<string, { name: string; slug: string }> = {};
	for (const app of result) {
		if (app.appid === null || app.name === null) continue;
		appNames[app.appid] = { name: app.name, slug: app.slug };
	}

	return appNames;
}

export async function searchSteamApps(
	query: string,
	database: SteamCatalogDatabase = db
): Promise<ISteamApp[]> {
	const trimmedQuery = query.trim();
	const searchName = normalizeSearchName(trimmedQuery);
	const tokens = getSearchTokens(trimmedQuery);
	if (!searchName || tokens.length === 0) return [];

	const tokenConditions = tokens.map(
		(token) => sql`${externalItem.searchName} like ${`%${escapeLike(token)}%`} escape ${'\\'}`
	);
	const rank = sql<number>`case
		when ${externalItem.searchName} = ${searchName} then 0
		when ${externalItem.searchName} like ${`${escapeLike(searchName)}%`} escape ${'\\'} then 1
		when ${externalItem.name} like ${`${escapeLike(trimmedQuery)}%`} escape ${'\\'} then 2
		when ${externalItem.searchName} like ${`%${escapeLike(searchName)}%`} escape ${'\\'} then 3
		else 4
	end`;

	const result = await database
		.select({
			appid: externalItem.externalId,
			name: externalItem.name,
			slug: externalItem.slug,
			rank
		})
		.from(externalItem)
		.where(
			and(
				eq(externalItem.type, STEAM_SOURCE),
				or(
					sql`${externalItem.name} like ${`%${escapeLike(trimmedQuery)}%`} escape ${'\\'}`,
					sql`${externalItem.searchName} like ${`%${escapeLike(searchName)}%`} escape ${'\\'}`,
					and(...tokenConditions)
				)
			)
		)
		.orderBy(asc(rank), asc(externalItem.name))
		.limit(20);

	return result
		.filter((game) => game.appid !== null && game.name !== null)
		.map((game) => ({
			appid: Number.parseInt(game.appid!, 10),
			name: game.name!,
			slug: game.slug
		}));
}

export async function getSteamAppListCursor(
	database: SteamCatalogDatabase = db
): Promise<number | null> {
	const state = await database.query.steamCatalogSyncState.findFirst({
		where: (syncState, { eq }) => eq(syncState.id, STEAM_CATALOG_SYNC_STATE_ID)
	});

	if (!state?.lastAppId) return null;
	const parsed = Number.parseInt(state.lastAppId, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

export async function markSteamAppListSyncStarted(
	cursor: number | null,
	database: SteamCatalogDatabase = db
) {
	const now = new Date();
	await database
		.insert(steamCatalogSyncState)
		.values({
			id: STEAM_CATALOG_SYNC_STATE_ID,
			lastAppId: cursor?.toString() ?? null,
			status: 'running',
			lastError: null,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: steamCatalogSyncState.id,
			set: {
				lastAppId: cursor?.toString() ?? null,
				status: 'running',
				lastError: null,
				updatedAt: now
			}
		})
		.run();
}

export async function markSteamAppListSyncFinished(
	cursor: number | null,
	status: 'partial' | 'complete',
	database: SteamCatalogDatabase = db
) {
	setSteamAppListSyncFinished(database, cursor, status, new Date());
}

export async function markSteamAppListSyncFailed(
	error: unknown,
	database: SteamCatalogDatabase = db
) {
	const now = new Date();
	const message = error instanceof Error ? error.message : String(error);
	await database
		.insert(steamCatalogSyncState)
		.values({
			id: STEAM_CATALOG_SYNC_STATE_ID,
			lastAppId: null,
			status: 'failed',
			lastError: message,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: steamCatalogSyncState.id,
			set: {
				status: 'failed',
				lastError: message,
				updatedAt: now
			}
		})
		.run();
}

export async function importSteamAppListPage(
	{
		apps,
		cursor,
		status,
		batchSize = DEFAULT_STEAM_APP_IMPORT_BATCH_SIZE,
		now = new Date()
	}: {
		apps: ISteamAppListItem[];
		cursor: number | null;
		status: 'partial' | 'complete';
		batchSize?: number;
		now?: Date;
	},
	database: SteamCatalogDatabase = db
): Promise<number> {
	return database.transaction((tx) => {
		const importedCount = upsertDiscoveredSteamApps(apps, { batchSize, now }, tx);
		setSteamAppListSyncFinished(tx, cursor, status, now);
		return importedCount;
	});
}

export function upsertDiscoveredSteamApps(
	apps: ISteamAppListItem[],
	{
		batchSize = DEFAULT_STEAM_APP_IMPORT_BATCH_SIZE,
		now = new Date()
	}: {
		batchSize?: number;
		now?: Date;
	} = {},
	executor: SteamCatalogExecutor = db
): number {
	const normalizedBatchSize = normalizeBatchSize(batchSize);

	for (let index = 0; index < apps.length; index += normalizedBatchSize) {
		const batch = apps.slice(index, index + normalizedBatchSize);
		const values = batch.map((app) => createSteamExternalItemValues(app, now));
		if (values.length === 0) continue;

		executor
			.insert(externalItem)
			.values(values)
			.onConflictDoUpdate({
				target: [externalItem.type, externalItem.externalId],
				set: {
					name: excluded(externalItem.name),
					normalizedName: excluded(externalItem.normalizedName),
					source: excluded(externalItem.source),
					appType: excluded(externalItem.appType),
					slug: excluded(externalItem.slug),
					searchName: excluded(externalItem.searchName),
					metadataJson: excluded(externalItem.metadataJson),
					updatedAt: excluded(externalItem.updatedAt)
				}
			})
			.run();
	}

	return apps.length;
}

export function attachSteamAppNames(
	rankedGames: Array<Omit<INamedSteamGame, 'name' | 'slug'>>,
	appNames: Record<string, { name: string; slug: string }>
): INamedSteamGame[] {
	return rankedGames.map((game) => {
		const app = appNames[game.appid.toString()];
		return {
			...game,
			name: app?.name || '',
			slug: app?.slug
		};
	});
}

function setSteamAppListSyncFinished(
	executor: SteamCatalogExecutor,
	cursor: number | null,
	status: 'partial' | 'complete',
	now: Date
) {
	executor
		.insert(steamCatalogSyncState)
		.values({
			id: STEAM_CATALOG_SYNC_STATE_ID,
			lastAppId: cursor?.toString() ?? null,
			status,
			lastError: null,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: steamCatalogSyncState.id,
			set: {
				lastAppId: cursor?.toString() ?? null,
				status,
				lastError: null,
				updatedAt: now
			}
		})
		.run();
}

function normalizeBatchSize(batchSize: number): number {
	if (!Number.isInteger(batchSize) || batchSize <= 0) {
		throw new Error('Steam app import batch size must be a positive integer');
	}

	return batchSize;
}

function excluded(column: { name: string }): SQL {
	return sql.raw(`excluded.${column.name}`);
}

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
