import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';
import { findCurrentUser, findUserByAuthProviderId, requireCurrentUser } from './users';

const MAX_FAVORITES = 500;

type FavoriteAuthArgs = {
	secret?: string;
	authProviderId?: string;
};

async function requireActiveUser(ctx: QueryCtx, authProviderId: string): Promise<Doc<'users'>> {
	const user = await findUserByAuthProviderId(ctx, authProviderId);
	if (!user || user.deletedAt) {
		throw new Error('User not found');
	}

	return user;
}

async function findFavoriteUser(
	ctx: QueryCtx,
	args: FavoriteAuthArgs
): Promise<Doc<'users'> | null> {
	if (args.secret !== undefined || args.authProviderId !== undefined) {
		if (!args.secret || !args.authProviderId) {
			throw new Error('Unauthorized');
		}

		requireServerSecret(args.secret);

		const user = await findUserByAuthProviderId(ctx, args.authProviderId);
		return user && !user.deletedAt ? user : null;
	}

	const user = await findCurrentUser(ctx);
	return user && !user.deletedAt ? user : null;
}

async function requireFavoriteUser(ctx: QueryCtx, args: FavoriteAuthArgs): Promise<Doc<'users'>> {
	if (args.secret !== undefined || args.authProviderId !== undefined) {
		if (!args.secret || !args.authProviderId) {
			throw new Error('Unauthorized');
		}

		requireServerSecret(args.secret);
		return await requireActiveUser(ctx, args.authProviderId);
	}

	return await requireCurrentUser(ctx);
}

export const getForUser = query({
	args: { secret: v.optional(v.string()), authProviderId: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const user = await findFavoriteUser(ctx, args);
		if (!user) {
			return { externalItems: [], projects: [] };
		}

		const externalItemFavorites = await ctx.db
			.query('externalItemFavorites')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.take(MAX_FAVORITES);

		const externalItems = [];
		for (const favorite of externalItemFavorites) {
			const item = await ctx.db.get(favorite.externalItemId);
			if (!item) continue;
			externalItems.push({
				id: item._id,
				name: item.name,
				normalizedName: item.normalizedName,
				type: item.type,
				externalId: item.externalId ?? null
			});
		}

		const projectFavorites = await ctx.db
			.query('projectFavorites')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.take(MAX_FAVORITES);

		const projects = [];
		for (const favorite of projectFavorites) {
			const project = await ctx.db.get(favorite.projectId);
			if (!project || project.deletedAt) continue;
			projects.push({
				id: project._id,
				name: project.name,
				normalizedName: project.normalizedName,
				slug: project.slug
			});
		}

		return { externalItems, projects };
	}
});

export const addExternalItem = mutation({
	args: {
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string()),
		externalItemId: v.id('externalItems')
	},
	handler: async (ctx, args) => {
		const user = await requireFavoriteUser(ctx, args);

		const existing = await ctx.db
			.query('externalItemFavorites')
			.withIndex('by_userId_and_externalItemId', (q) =>
				q.eq('userId', user._id).eq('externalItemId', args.externalItemId)
			)
			.unique();
		if (existing) return null;

		const item = await ctx.db.get(args.externalItemId);
		if (!item) {
			throw new Error('External item not found');
		}

		await ctx.db.insert('externalItemFavorites', {
			userId: user._id,
			externalItemId: args.externalItemId
		});
		return null;
	}
});

export const removeExternalItem = mutation({
	args: {
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string()),
		externalItemId: v.id('externalItems')
	},
	handler: async (ctx, args) => {
		const user = await requireFavoriteUser(ctx, args);

		const existing = await ctx.db
			.query('externalItemFavorites')
			.withIndex('by_userId_and_externalItemId', (q) =>
				q.eq('userId', user._id).eq('externalItemId', args.externalItemId)
			)
			.unique();
		if (existing) {
			await ctx.db.delete(existing._id);
		}
		return null;
	}
});

export const addProject = mutation({
	args: {
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string()),
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const user = await requireFavoriteUser(ctx, args);

		const existing = await ctx.db
			.query('projectFavorites')
			.withIndex('by_userId_and_projectId', (q) =>
				q.eq('userId', user._id).eq('projectId', args.projectId)
			)
			.unique();
		if (existing) return null;

		const project = await ctx.db.get(args.projectId);
		if (!project || project.deletedAt) {
			throw new Error('Project not found');
		}

		await ctx.db.insert('projectFavorites', {
			userId: user._id,
			projectId: args.projectId
		});
		return null;
	}
});

export const removeProject = mutation({
	args: {
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string()),
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const user = await requireFavoriteUser(ctx, args);

		const existing = await ctx.db
			.query('projectFavorites')
			.withIndex('by_userId_and_projectId', (q) =>
				q.eq('userId', user._id).eq('projectId', args.projectId)
			)
			.unique();
		if (existing) {
			await ctx.db.delete(existing._id);
		}
		return null;
	}
});
