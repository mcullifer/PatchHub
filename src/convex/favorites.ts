import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation, mutation, query, type QueryCtx } from './_generated/server';
import { requireActiveUser } from './users';

const PROJECT_FAVORITE_CLEANUP_BATCH_SIZE = 100;

export const list = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireActiveUser(ctx);

		const [externalItemFavorites, projectFavorites] = await Promise.all([
			ctx.db
				.query('externalItemFavorites')
				.withIndex('by_userId', (q) => q.eq('userId', user._id))
				.collect(),
			ctx.db
				.query('projectFavorites')
				.withIndex('by_userId', (q) => q.eq('userId', user._id))
				.collect()
		]);
		const [externalItems, projects] = await Promise.all([
			Promise.all(externalItemFavorites.map((favorite) => getExternalItem(ctx, favorite))),
			Promise.all(projectFavorites.map((favorite) => getProject(ctx, favorite)))
		]);

		return {
			externalItems: externalItems.filter((item) => item !== null),
			projects: projects.filter((project) => project !== null)
		};
	}
});

export const removeForProject = internalMutation({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, { projectId }) => {
		const favorites = await ctx.db
			.query('projectFavorites')
			.withIndex('by_projectId', (q) => q.eq('projectId', projectId))
			.take(PROJECT_FAVORITE_CLEANUP_BATCH_SIZE);

		await Promise.all(favorites.map(({ _id }) => ctx.db.delete(_id)));

		if (favorites.length === PROJECT_FAVORITE_CLEANUP_BATCH_SIZE) {
			await ctx.scheduler.runAfter(0, internal.favorites.removeForProject, { projectId });
		}

		return null;
	}
});

export const setExternalItem = mutation({
	args: {
		externalItemId: v.id('externalItems'),
		favorited: v.boolean()
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

		const existing = await ctx.db
			.query('externalItemFavorites')
			.withIndex('by_userId_and_externalItemId', (q) =>
				q.eq('userId', user._id).eq('externalItemId', args.externalItemId)
			)
			.unique();
		if (!args.favorited) {
			if (existing) await ctx.db.delete(existing._id);
			return null;
		}

		if (existing) return await getExternalItem(ctx, existing);

		const item = await ctx.db.get(args.externalItemId);
		if (!item) throw new Error('External item not found');

		const favoriteId = await ctx.db.insert('externalItemFavorites', {
			userId: user._id,
			externalItemId: args.externalItemId
		});
		const favorite = await ctx.db.get(favoriteId);
		return favorite ? toExternalItem(favorite, item) : null;
	}
});

export const setProject = mutation({
	args: {
		projectId: v.id('projects'),
		favorited: v.boolean()
	},
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);

		const existing = await ctx.db
			.query('projectFavorites')
			.withIndex('by_userId_and_projectId', (q) =>
				q.eq('userId', user._id).eq('projectId', args.projectId)
			)
			.unique();
		if (!args.favorited) {
			if (existing) await ctx.db.delete(existing._id);
			return null;
		}

		if (existing) return await getProject(ctx, existing);

		const project = await ctx.db.get(args.projectId);
		if (!project || project.deletedAt) throw new Error('Project not found');

		const favoriteId = await ctx.db.insert('projectFavorites', {
			userId: user._id,
			projectId: args.projectId
		});
		const favorite = await ctx.db.get(favoriteId);
		return favorite ? await toProject(ctx, favorite, project) : null;
	}
});

async function getExternalItem(ctx: QueryCtx, favorite: Doc<'externalItemFavorites'>) {
	const item = await ctx.db.get(favorite.externalItemId);
	if (!item) return null;

	return toExternalItem(favorite, item);
}

function toExternalItem(favorite: Doc<'externalItemFavorites'>, item: Doc<'externalItems'>) {
	return {
		id: item._id,
		favoritedAt: favorite._creationTime,
		name: item.name,
		type: item.type,
		externalId: item.externalId ?? null,
		slug: item.slug
	};
}

async function getProject(ctx: QueryCtx, favorite: Doc<'projectFavorites'>) {
	const project = await ctx.db.get(favorite.projectId);
	if (!project || project.deletedAt) return null;

	return await toProject(ctx, favorite, project);
}

async function toProject(
	ctx: QueryCtx,
	favorite: Doc<'projectFavorites'>,
	project: Doc<'projects'>
) {
	const createdBy = await getProjectOwnerSlug(ctx, project);
	if (!createdBy) return null;

	const bannerUrl = project.bannerStorageId
		? await ctx.storage.getUrl(project.bannerStorageId)
		: null;

	return {
		id: project._id,
		favoritedAt: favorite._creationTime,
		name: project.name,
		slug: project.slug,
		createdBy,
		bannerUrl
	};
}

async function getProjectOwnerSlug(
	ctx: QueryCtx,
	project: Doc<'projects'>
): Promise<string | null> {
	if (project.userId) {
		const user = await ctx.db.get(project.userId);
		return user && !user.deletedAt ? (user.username ?? null) : null;
	}

	if (project.orgId) {
		const organization = await ctx.db.get(project.orgId);
		return organization && !organization.deletedAt ? (organization.slug ?? null) : null;
	}

	return null;
}
