import { command, getRequestEvent } from '$app/server';
import { api } from '$convex/_generated/api';
import { requirePatchHubAdmin } from '$lib/server/auth/admin';
import { convex, getConvexServerSecret } from '$lib/server/convex';
import * as v from 'valibot';

const steamSyncOptionsSchema = v.object({
	maxPages: v.optional(v.number()),
	delayMs: v.optional(v.number()),
	startCursor: v.optional(v.number()),
	batchSize: v.optional(v.number())
});

export const runSteamCatalogSync = command(steamSyncOptionsSchema, async (options) => {
	const event = getRequestEvent();
	await requirePatchHubAdmin(event);

	const args: {
		secret: string;
		maxPages?: number;
		delayMs?: number;
		startCursor?: number;
		batchSize?: number;
	} = { secret: getConvexServerSecret() };

	if (options.maxPages !== undefined) args.maxPages = options.maxPages;
	if (options.delayMs !== undefined) args.delayMs = options.delayMs;
	if (options.startCursor !== undefined) args.startCursor = options.startCursor;
	if (options.batchSize !== undefined) args.batchSize = options.batchSize;

	return await convex.action(api.steamSync.runManual, args);
});
