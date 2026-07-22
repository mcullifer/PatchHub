import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireActiveUser } from './users';

const MAX_FAVORITES = 500;

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireActiveUser(ctx);

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
				externalId: item.externalId ?? null
			});
		}

		const projectFavorites = await ctx.db
			.query('projectFavorites')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.take(MAX_FAVORITES);

		const projectIds = [];
		for (const favorite of projectFavorites) {
			const project = await ctx.db.get(favorite.projectId);
			if (!project || project.deletedAt) continue;
			projectIds.push(project._id);
		}

		return { externalItems, projectIds };
	}
});

export const addExternalItem = mutation({
	args: {
		externalItemId: v.id('externalItems')
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

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
		externalItemId: v.id('externalItems')
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

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
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

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
		projectId: v.id('projects')
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

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
