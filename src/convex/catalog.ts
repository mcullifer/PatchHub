import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { upsertExternalItem } from './lib/externalItems';
import { requireServerSecret } from './lib/serverSecret';
import { STEAM_SOURCE } from './lib/steam';

const SEARCH_RESULT_LIMIT = 20;
const MAX_APP_ID_LOOKUPS = 200;

export const searchExternalItems = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const searchQuery = args.query.trim();
		if (!searchQuery) return [];

		const items = await ctx.db
			.query('externalItems')
			.withSearchIndex('search_name', (q) => q.search('name', searchQuery))
			.take(SEARCH_RESULT_LIMIT);

		const results: Array<
			| { type: 'steam'; appid: number; name: string; slug: string }
			| { type: 'software'; name: string; slug: string }
		> = [];
		for (const item of items) {
			if (item.type === 'software') {
				results.push({ type: item.type, name: item.name, slug: item.slug });
				continue;
			}

			const appid = Number(item.externalId);
			if (!Number.isSafeInteger(appid) || appid <= 0) continue;

			results.push({ type: item.type, appid, name: item.name, slug: item.slug });
		}
		return results;
	}
});

export const getSteamAppNamesByAppIds = query({
	args: { appIds: v.array(v.number()) },
	handler: async (ctx, args) => {
		const appNames: Record<string, { id: Id<'externalItems'>; name: string; slug: string }> = {};
		const uniqueAppIds = [...new Set(args.appIds)].slice(0, MAX_APP_ID_LOOKUPS);

		for (const appId of uniqueAppIds) {
			const item = await ctx.db
				.query('externalItems')
				.withIndex('by_type_and_externalId', (q) =>
					q.eq('type', STEAM_SOURCE).eq('externalId', appId.toString())
				)
				.unique();
			if (!item) continue;
			appNames[appId.toString()] = { id: item._id, name: item.name, slug: item.slug };
		}

		return appNames;
	}
});

export const getSteamAppByAppId = query({
	args: { appid: v.number() },
	handler: async (ctx, args) => {
		const item = await ctx.db
			.query('externalItems')
			.withIndex('by_type_and_externalId', (q) =>
				q.eq('type', STEAM_SOURCE).eq('externalId', args.appid.toString())
			)
			.unique();
		if (!item) return null;

		return {
			id: item._id,
			appid: args.appid,
			name: item.name,
			slug: item.slug
		};
	}
});

export const getItemIdByTypeAndExternalId = query({
	args: {
		type: v.union(v.literal('steam'), v.literal('software')),
		externalId: v.string()
	},
	handler: async (ctx, args) => {
		const item = await ctx.db
			.query('externalItems')
			.withIndex('by_type_and_externalId', (q) =>
				q.eq('type', args.type).eq('externalId', args.externalId)
			)
			.unique();

		return item?._id ?? null;
	}
});

export const upsertSoftwareSource = mutation({
	args: {
		secret: v.string(),
		name: v.string(),
		externalId: v.string(),
		slug: v.string(),
		metadataJson: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		await upsertExternalItem(ctx, {
			name: args.name,
			type: 'software',
			externalId: args.externalId,
			slug: args.slug,
			metadataJson: args.metadataJson,
			updatedAt: Date.now()
		});
		return null;
	}
});
