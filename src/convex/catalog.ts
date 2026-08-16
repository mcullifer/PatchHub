import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { parseSoftwareSourceMetadata, resolveSoftwareSourceImageUrl } from './lib/externalItems';
import { isValidStoredImage } from '../lib/images/imageValidation';
import { STEAM_SOURCE } from './lib/steam';
import { requireActiveUser } from './users';

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

export const listSoftwareSources = query({
	args: {},
	handler: async (ctx) => {
		const sources = await ctx.db
			.query('externalItems')
			.withIndex('by_type_and_externalId', (q) => q.eq('type', 'software'))
			.take(100);

		return await Promise.all(
			sources.map(async (source) => ({
				...source,
				resolvedImageUrl: await resolveSoftwareSourceImageUrl(ctx, source.metadataJson)
			}))
		);
	}
});

export const createSoftwareSource = mutation({
	args: {
		name: v.string(),
		slug: v.string(),
		metadataJson: v.string(),
		bannerStorageId: v.id('_storage'),
		bannerContentType: v.string()
	},
	returns: v.object({ id: v.id('externalItems'), slug: v.string() }),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		await requireUnusedSoftwareSourceSlug(ctx, args.slug);
		await requireSoftwareBanner(ctx, args.bannerStorageId, args.bannerContentType);

		const id = await ctx.db.insert('externalItems', {
			name: args.name,
			type: 'software',
			externalId: args.slug,
			slug: args.slug,
			metadataJson: JSON.stringify({
				...parseSoftwareSourceMetadata(args.metadataJson),
				imageStorageId: args.bannerStorageId
			}),
			updatedAt: Date.now()
		});

		return { id, slug: args.slug };
	}
});

async function requireAdmin(ctx: Pick<MutationCtx, 'auth' | 'db'>): Promise<void> {
	const user = await requireActiveUser(ctx);
	if (user.platformRole !== 'admin') {
		throw new Error('Admin access required');
	}
}

async function requireUnusedSoftwareSourceSlug(
	ctx: Pick<MutationCtx, 'db'>,
	slug: string
): Promise<void> {
	const existing = await ctx.db
		.query('externalItems')
		.withIndex('by_type_and_externalId', (q) => q.eq('type', 'software').eq('externalId', slug))
		.unique();
	if (existing) {
		throw new Error('A software source with this name already exists');
	}
}

async function requireSoftwareBanner(
	ctx: Pick<MutationCtx, 'db'>,
	storageId: Id<'_storage'>,
	contentType: string
): Promise<void> {
	const metadata = await ctx.db.system.get('_storage', storageId);
	if (!isValidStoredImage(metadata, contentType)) {
		throw new Error('Software banner is invalid');
	}
}

export const updateSoftwareSourceRendering = mutation({
	args: {
		slug: v.string(),
		rendering: v.union(v.literal('excerpt'), v.literal('full'))
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const source = await ctx.db
			.query('externalItems')
			.withIndex('by_type_and_externalId', (q) =>
				q.eq('type', 'software').eq('externalId', args.slug)
			)
			.unique();
		if (!source?.metadataJson) {
			throw new Error('Software source not found');
		}

		const metadata = parseSoftwareSourceMetadata(source.metadataJson);

		await ctx.db.patch('externalItems', source._id, {
			metadataJson: JSON.stringify({ ...metadata, rendering: args.rendering }),
			updatedAt: Date.now()
		});
	}
});
