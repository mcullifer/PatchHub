import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	type ActionCtx,
	type MutationCtx
} from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';
import { createSteamExternalItemValues, fetchSteamAppListPage } from './lib/steam';
import { upsertExternalItem } from './lib/externalItems';

// Keep each import mutation small because externalItems has a search index.
// Larger batches make Convex's search-index metadata writer more likely to
// contend with the import transaction.
const IMPORT_MUTATION_BATCH_SIZE = 50;
const MAX_IMPORT_MUTATION_BATCH_SIZE = 500;
const MAX_SYNC_PAGES_PER_ACTION = 10;
const MAX_SYNC_DELAY_MS = 60_000;

const steamAppValidator = v.object({
	appid: v.number(),
	name: v.string(),
	last_modified: v.optional(v.number()),
	price_change_number: v.optional(v.number())
});
const syncOptionsValidator = {
	maxPages: v.optional(v.number()),
	delayMs: v.optional(v.number()),
	startCursor: v.optional(v.number()),
	batchSize: v.optional(v.number())
};

const syncStatusValidator = v.union(v.literal('partial'), v.literal('complete'));
type SyncStateStatus = 'idle' | 'running' | 'partial' | 'complete' | 'failed';
type SteamSyncOptions = {
	maxPages?: number;
	delayMs?: number;
	startCursor?: number;
	batchSize?: number;
};
type NormalizedSteamSyncOptions = {
	maxPages?: number;
	delayMs: number;
	startCursor?: number;
	batchSize: number;
};

export type SteamSyncResult = {
	batchesFetched: number;
	appsImported: number;
	finalCursor: number | null;
	haveMoreResults: boolean;
};

async function upsertSyncState(
	ctx: MutationCtx,
	fields: { lastAppId?: string | null; status: SyncStateStatus; lastError?: string | null }
) {
	const state = await ctx.db
		.query('steamCatalogSyncState')
		.withIndex('by_key', (q) => q.eq('key', 'singleton'))
		.unique();

	const lastAppId = fields.lastAppId === undefined ? state?.lastAppId : fields.lastAppId;
	const lastError = fields.lastError === undefined ? state?.lastError : fields.lastError;
	const nextState: {
		key: 'singleton';
		lastAppId?: string;
		status: SyncStateStatus;
		lastError?: string;
		updatedAt: number;
	} = {
		key: 'singleton',
		status: fields.status,
		updatedAt: Date.now()
	};

	if (lastAppId !== undefined && lastAppId !== null) {
		nextState.lastAppId = lastAppId;
	}

	if (lastError !== undefined && lastError !== null) {
		nextState.lastError = lastError;
	}

	if (state) {
		await ctx.db.replace(state._id, nextState);
		return;
	}

	await ctx.db.insert('steamCatalogSyncState', nextState);
}

export const getCursor = internalQuery({
	args: {},
	handler: async (ctx) => {
		const state = await ctx.db
			.query('steamCatalogSyncState')
			.withIndex('by_key', (q) => q.eq('key', 'singleton'))
			.unique();

		if (!state?.lastAppId) return null;
		const parsed = Number.parseInt(state.lastAppId, 10);
		return Number.isNaN(parsed) ? null : parsed;
	}
});

export const markStarted = internalMutation({
	args: { cursor: v.union(v.number(), v.null()) },
	handler: async (ctx, args) => {
		await upsertSyncState(ctx, {
			lastAppId: args.cursor === null ? null : args.cursor.toString(),
			status: 'running',
			lastError: null
		});
		return null;
	}
});

export const markFailed = internalMutation({
	args: { message: v.string() },
	handler: async (ctx, args) => {
		await upsertSyncState(ctx, { status: 'failed', lastError: args.message });
		return null;
	}
});

export const setFinished = internalMutation({
	args: { cursor: v.union(v.number(), v.null()), status: syncStatusValidator },
	handler: async (ctx, args) => {
		await upsertSyncState(ctx, {
			lastAppId: args.cursor === null ? null : args.cursor.toString(),
			status: args.status,
			lastError: null
		});
		return null;
	}
});

export const importBatch = internalMutation({
	args: { apps: v.array(steamAppValidator) },
	handler: async (ctx, args) => {
		const now = Date.now();
		let appsWritten = 0;
		for (const app of args.apps) {
			if (await upsertExternalItem(ctx, createSteamExternalItemValues(app, now))) {
				appsWritten++;
			}
		}
		return appsWritten;
	}
});

// The full catalog sync (~175k apps) takes longer than a single action is
// allowed to run; use maxPages to sync in chunks, or rely on the cursor to
// resume where the last run stopped.
export const runScheduled = internalAction({
	args: {
		...syncOptionsValidator
	},
	handler: async (ctx, args): Promise<SteamSyncResult> => {
		return await runSync(ctx, args);
	}
});

export const runManual = action({
	args: {
		secret: v.string(),
		...syncOptionsValidator
	},
	handler: async (ctx, args): Promise<SteamSyncResult> => {
		requireServerSecret(args.secret);
		return await runSync(ctx, args);
	}
});

async function runSync(ctx: ActionCtx, options: SteamSyncOptions): Promise<SteamSyncResult> {
	const syncOptions = normalizeSyncOptions(options);
	const apiKey = process.env.STEAM_API_KEY;
	if (!apiKey) {
		throw new Error('STEAM_API_KEY is not configured on the Convex deployment');
	}

	let cursor = syncOptions.startCursor ?? (await ctx.runQuery(internal.steamSync.getCursor, {}));
	let batchesFetched = 0;
	let appsImported = 0;
	let haveMoreResults = false;

	await ctx.runMutation(internal.steamSync.markStarted, { cursor });

	try {
		for (let page = 0; syncOptions.maxPages === undefined || page < syncOptions.maxPages; page++) {
			const response = await fetchSteamAppListPage({ apiKey, lastAppId: cursor });

			if (response.apps.length === 0) {
				haveMoreResults = false;
				await ctx.runMutation(internal.steamSync.setFinished, {
					cursor,
					status: 'complete'
				});
				break;
			}

			const nextCursor = response.lastAppId;
			haveMoreResults = response.haveMoreResults;
			const status = haveMoreResults ? 'partial' : 'complete';

			for (let index = 0; index < response.apps.length; index += syncOptions.batchSize) {
				const batch = response.apps.slice(index, index + syncOptions.batchSize).map((app) => ({
					appid: app.appid,
					name: app.name,
					last_modified: app.last_modified,
					price_change_number: app.price_change_number
				}));
				appsImported += await ctx.runMutation(internal.steamSync.importBatch, {
					apps: batch
				});
			}

			await ctx.runMutation(internal.steamSync.setFinished, {
				cursor: nextCursor,
				status
			});

			batchesFetched++;
			cursor = nextCursor;

			if (!haveMoreResults) break;
			if (syncOptions.delayMs > 0) await sleep(syncOptions.delayMs);
		}

		return {
			batchesFetched,
			appsImported,
			finalCursor: cursor,
			haveMoreResults
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await ctx.runMutation(internal.steamSync.markFailed, { message });
		throw error;
	}
}

function normalizeSyncOptions(options: SteamSyncOptions): NormalizedSteamSyncOptions {
	return {
		maxPages: positiveIntegerOption('Steam sync maxPages', options.maxPages, {
			maximum: MAX_SYNC_PAGES_PER_ACTION
		}),
		delayMs:
			nonNegativeIntegerOption('Steam sync delayMs', options.delayMs, {
				maximum: MAX_SYNC_DELAY_MS
			}) ?? 0,
		startCursor: nonNegativeIntegerOption('Steam sync startCursor', options.startCursor),
		batchSize:
			positiveIntegerOption('Steam app import batch size', options.batchSize, {
				maximum: MAX_IMPORT_MUTATION_BATCH_SIZE
			}) ?? IMPORT_MUTATION_BATCH_SIZE
	};
}

function positiveIntegerOption(
	name: string,
	value: number | undefined,
	options: { maximum?: number } = {}
): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}

	if (options.maximum !== undefined && value > options.maximum) {
		throw new Error(`${name} must be at most ${options.maximum}`);
	}

	return value;
}

function nonNegativeIntegerOption(
	name: string,
	value: number | undefined,
	options: { maximum?: number } = {}
): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative integer`);
	}

	if (options.maximum !== undefined && value > options.maximum) {
		throw new Error(`${name} must be at most ${options.maximum}`);
	}

	return value;
}

function sleep(delayMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}
