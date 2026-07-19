import { v, type Infer } from 'convex/values';
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
import {
	createSteamExternalItemValues,
	fetchSteamAppListPage,
	steamAppValidator,
	type SteamAppListItem
} from './lib/steam';
import { upsertExternalItem } from './lib/externalItems';

// A batch of 500 keeps each import transaction far under the per-transaction
// limits (4,096 index ranges, 32k documents scanned, 16k written, 16 MiB) while
// keeping the blast radius of a failed batch small.
const IMPORT_MUTATION_BATCH_SIZE = 500;
const MAX_IMPORT_MUTATION_BATCH_SIZE = 2000;
const MAX_SYNC_PAGES_PER_ACTION = 10;
const MAX_SYNC_DELAY_MS = 60_000;
// A full from-scratch catalog sync needs ~3 continuations; hitting this cap
// means the run is looping, so stop and leave recovery to the manual script.
const MAX_SCHEDULED_CONTINUATIONS = 25;

const syncOptionsValidator = v.object({
	maxPages: v.optional(v.number()),
	delayMs: v.optional(v.number()),
	startCursor: v.optional(v.number()),
	batchSize: v.optional(v.number())
});

const syncStatusValidator = v.union(v.literal('partial'), v.literal('complete'));
type SyncStateStatus = 'idle' | 'running' | 'partial' | 'complete' | 'failed';
type SteamSyncOptions = Infer<typeof syncOptionsValidator>;
type NormalizedSteamSyncOptions = {
	maxPages: number;
	delayMs: number;
	startCursor?: number;
	batchSize: number;
};

export type SteamSyncResult = {
	pagesFetched: number;
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

	// undefined = keep the stored value, null = clear it, a value = set it.
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

export const recordProgress = internalMutation({
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

// The args validator only guarantees numbers; values like NaN would corrupt
// the externalId key and the cursor, so skip them instead of failing the batch.
function isImportableSteamApp(app: SteamAppListItem): boolean {
	return Number.isSafeInteger(app.appid) && app.appid > 0;
}

export const importBatch = internalMutation({
	args: { apps: v.array(steamAppValidator) },
	handler: async (ctx, args) => {
		const now = Date.now();
		// Dedupe by appid so a repeated row cannot race itself into two inserts.
		const apps = [
			...new Map(args.apps.filter(isImportableSteamApp).map((app) => [app.appid, app])).values()
		];
		const written = await Promise.all(
			apps.map((app) => upsertExternalItem(ctx, createSteamExternalItemValues(app, now)))
		);

		// Advance the cursor in the same transaction so an interrupted run
		// resumes after the last batch that durably landed.
		if (apps.length > 0) {
			await upsertSyncState(ctx, {
				lastAppId: Math.max(...apps.map((app) => app.appid)).toString(),
				status: 'running'
			});
		}

		return written.filter(Boolean).length;
	}
});

// The cron kicks off one run per day; each action imports a bounded chunk of
// pages, then reschedules itself until Steam reports no more results.
export const runScheduled = internalAction({
	args: {
		...syncOptionsValidator.omit('startCursor').fields,
		continuation: v.optional(v.number())
	},
	handler: async (ctx, args): Promise<SteamSyncResult | null> => {
		const { continuation = 0, ...options } = args;
		if (continuation >= MAX_SCHEDULED_CONTINUATIONS) {
			await ctx.runMutation(internal.steamSync.markFailed, {
				message: `Steam sync stopped after ${MAX_SCHEDULED_CONTINUATIONS} continuations without finishing; resume with npm run steam:sync`
			});
			return null;
		}

		const result = await runSync(ctx, options);
		if (result.haveMoreResults) {
			await ctx.scheduler.runAfter(options.delayMs ?? 0, internal.steamSync.runScheduled, {
				...options,
				continuation: continuation + 1
			});
		}
		return result;
	}
});

export const runManual = action({
	args: { secret: v.string(), ...syncOptionsValidator.fields },
	handler: async (ctx, args): Promise<SteamSyncResult> => {
		const { secret, ...options } = args;
		requireServerSecret(secret);
		return await runSync(ctx, options);
	}
});

async function runSync(ctx: ActionCtx, options: SteamSyncOptions): Promise<SteamSyncResult> {
	const syncOptions = normalizeSyncOptions(options);
	const apiKey = process.env.STEAM_API_KEY;
	if (!apiKey) {
		throw new Error('STEAM_API_KEY is not configured on the Convex deployment');
	}

	let cursor = syncOptions.startCursor ?? (await ctx.runQuery(internal.steamSync.getCursor, {}));
	let pagesFetched = 0;
	let appsImported = 0;
	let haveMoreResults = false;

	await ctx.runMutation(internal.steamSync.markStarted, { cursor });

	try {
		for (let page = 0; page < syncOptions.maxPages; page++) {
			const response = await fetchSteamAppListPage({ apiKey, lastAppId: cursor });
			const nextCursor = response.lastAppId ?? cursor;

			// A page can come back empty because the catalog is exhausted or
			// because every row was malformed and got filtered. Keep paging as
			// long as Steam reports more results and the cursor can advance;
			// otherwise an all-malformed page would stall the sync forever.
			haveMoreResults =
				response.haveMoreResults && (response.apps.length > 0 || nextCursor !== cursor);

			for (let index = 0; index < response.apps.length; index += syncOptions.batchSize) {
				// Project to exactly the validated fields; the strict importBatch
				// validator rejects extra keys the Steam JSON carried through.
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

			pagesFetched++;
			cursor = nextCursor;
			await ctx.runMutation(internal.steamSync.recordProgress, {
				cursor,
				status: haveMoreResults ? 'partial' : 'complete'
			});

			if (!haveMoreResults) break;
			// Delay only between fetches; the caller spaces out chunk boundaries.
			if (syncOptions.delayMs > 0 && page + 1 < syncOptions.maxPages) {
				await sleep(syncOptions.delayMs);
			}
		}

		return {
			pagesFetched,
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
		maxPages:
			positiveIntegerOption('Steam sync maxPages', options.maxPages, {
				maximum: MAX_SYNC_PAGES_PER_ACTION
			}) ?? MAX_SYNC_PAGES_PER_ACTION,
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
