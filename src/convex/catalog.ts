import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { upsertExternalItem } from './lib/externalItems';
import { requireServerSecret } from './lib/serverSecret';
import { STEAM_SOURCE } from './lib/steam';
import { normalizeSearchName } from './lib/strings';

const SEARCH_RESULT_LIMIT = 20;
const MAX_APP_ID_LOOKUPS = 200;

export const searchSteam = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const searchName = normalizeSearchName(args.query.trim());
		if (!searchName) return [];

		const items = await ctx.db
			.query('externalItems')
			.withSearchIndex('search_searchName', (q) =>
				q.search('searchName', searchName).eq('type', STEAM_SOURCE)
			)
			.take(SEARCH_RESULT_LIMIT);

		return items
			.filter((item) => item.externalId !== undefined)
			.map((item) => ({
				appid: Number.parseInt(item.externalId!, 10),
				name: item.name,
				slug: item.slug
			}));
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

export const getItemIdByTypeAndSlug = query({
	args: { type: v.string(), slug: v.string() },
	handler: async (ctx, args) => {
		const item = await ctx.db
			.query('externalItems')
			.withIndex('by_type_and_slug', (q) => q.eq('type', args.type).eq('slug', args.slug))
			.first();

		return item?._id ?? null;
	}
});

export const upsertSoftwareSource = mutation({
	args: {
		secret: v.string(),
		name: v.string(),
		normalizedName: v.string(),
		externalId: v.string(),
		source: v.optional(v.string()),
		slug: v.string(),
		searchName: v.string(),
		metadataJson: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		await upsertExternalItem(ctx, {
			name: args.name,
			normalizedName: args.normalizedName,
			type: 'software',
			externalId: args.externalId,
			source: args.source,
			appType: 'software',
			slug: args.slug,
			searchName: args.searchName,
			metadataJson: args.metadataJson,
			updatedAt: Date.now()
		});
		return null;
	}
});
