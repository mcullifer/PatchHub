import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { query, type QueryCtx } from './_generated/server';
import { normalizeUsername } from './lib/usernames';

export const getByOwnerAndSlug = query({
	args: { createdBy: v.string(), projectSlug: v.string() },
	handler: async (ctx, args) => {
		const createdBy = normalizeUsername(args.createdBy);
		const projectSlug = args.projectSlug.toLowerCase();

		const owner = await findOwner(ctx, createdBy);
		if (!owner) return null;

		const project = await findProjectByOwnerAndSlug(ctx, owner, projectSlug);
		if (!project) return null;

		return {
			id: project._id,
			name: project.name,
			normalizedName: project.normalizedName,
			slug: project.slug
		};
	}
});

type ProjectOwner = { kind: 'user'; id: Id<'users'> } | { kind: 'org'; id: Id<'organizations'> };

async function findProjectByOwnerAndSlug(ctx: QueryCtx, owner: ProjectOwner, projectSlug: string) {
	const candidates =
		owner.kind === 'user'
			? await ctx.db
					.query('projects')
					.withIndex('by_userId_and_slug', (q) => q.eq('userId', owner.id).eq('slug', projectSlug))
					.take(10)
			: await ctx.db
					.query('projects')
					.withIndex('by_orgId_and_slug', (q) => q.eq('orgId', owner.id).eq('slug', projectSlug))
					.take(10);

	return candidates.find((candidate) => !candidate.deletedAt) ?? null;
}

async function findOwner(ctx: QueryCtx, slug: string) {
	const user = await ctx.db
		.query('users')
		.withIndex('by_username', (q) => q.eq('username', slug))
		.unique();
	if (user && !user.deletedAt) {
		return { kind: 'user' as const, id: user._id };
	}

	const organization = await ctx.db
		.query('organizations')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
	if (organization && !organization.deletedAt) {
		return { kind: 'org' as const, id: organization._id };
	}

	return null;
}
