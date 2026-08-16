import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from './lib/contentLimits';
import { isValidStoredImage } from '../lib/images/imageValidation';
import { rateLimiter } from './lib/rateLimits';
import { requireServerSecret } from './lib/serverSecret';
import { createSlug, normalizeName } from './lib/strings';
import { normalizeUsername } from './lib/usernames';
import { requireActiveUser } from './users';

const OWNER_PROJECT_LIMIT = 100;
const MAX_SLUG_ATTEMPTS = 1000;

type ProjectLookupCtx = Pick<QueryCtx, 'db'>;
type AuthenticatedProjectLookupCtx = Pick<QueryCtx, 'auth' | 'db'>;

export type ProjectOwner =
	| {
			kind: 'user';
			id: Id<'users'>;
			authProviderId: string;
			name: string;
			createdAt: number;
	  }
	| {
			kind: 'org';
			id: Id<'organizations'>;
			name: string;
			createdAt: number;
	  };

export const getOwnedBySlug = query({
	args: { createdBy: v.string(), projectSlug: v.string() },
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);
		if (user.username !== normalizeUsername(args.createdBy)) return null;

		const project = await ctx.db
			.query('projects')
			.withIndex('by_userId_and_slug_and_deletedAt', (q) =>
				q
					.eq('userId', user._id)
					.eq('slug', args.projectSlug.toLowerCase())
					.eq('deletedAt', undefined)
			)
			.unique();
		if (!project) return null;

		return {
			id: project._id,
			name: project.name,
			slug: project.slug
		};
	}
});

export const getOwnerProfile = query({
	args: { secret: v.string(), createdBy: v.string() },
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		const profile = await getOwnerProfileData(ctx, args.createdBy);
		if (!profile) return null;

		return {
			owner: profile.owner,
			projects: profile.projects
		};
	}
});

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		bannerStorageId: v.optional(v.id('_storage')),
		bannerContentType: v.optional(v.string())
	},
	returns: v.object({ id: v.id('projects'), createdBy: v.string(), slug: v.string() }),
	handler: async (ctx, args) => {
		const user = await requireActiveUser(ctx);
		if (!user.username) {
			throw new Error('Account setup is required');
		}

		const rateLimit = await rateLimiter.limit(ctx, 'createProject', { key: user._id });
		if (!rateLimit.ok) {
			throw new Error('Too many new projects — please try again later.');
		}

		const name = normalizeProjectName(args.name);
		const description = normalizeProjectDescription(args.description);
		if (args.bannerStorageId) {
			await requireValidUnusedBanner(ctx, args.bannerStorageId, args.bannerContentType);
		}
		const slug = await createUniqueProjectSlug(ctx, user._id, createSlug(name, 'project'));
		const id = await ctx.db.insert('projects', {
			name,
			normalizedName: normalizeName(name),
			slug,
			description,
			bannerStorageId: args.bannerStorageId,
			userId: user._id,
			updatedAt: Date.now()
		});

		return {
			id,
			createdBy: user.username,
			slug
		};
	}
});

export const update = mutation({
	args: {
		projectId: v.id('projects'),
		name: v.string(),
		description: v.optional(v.string()),
		bannerStorageId: v.optional(v.id('_storage')),
		bannerContentType: v.optional(v.string())
	},
	returns: v.object({ slug: v.string() }),
	handler: async (ctx, args) => {
		const { project } = await requireOwnedProject(ctx, args.projectId);
		const name = normalizeProjectName(args.name);
		const description = normalizeProjectDescription(args.description);
		if (args.bannerStorageId) {
			await requireValidUnusedBanner(ctx, args.bannerStorageId, args.bannerContentType);
		}
		await ctx.db.patch(project._id, {
			name,
			normalizedName: normalizeName(name),
			description,
			bannerStorageId: args.bannerStorageId ?? project.bannerStorageId,
			updatedAt: Date.now()
		});
		if (
			args.bannerStorageId &&
			project.bannerStorageId &&
			project.bannerStorageId !== args.bannerStorageId
		) {
			await ctx.storage.delete(project.bannerStorageId);
		}

		return { slug: project.slug };
	}
});

export const remove = mutation({
	args: {
		projectId: v.id('projects')
	},
	handler: async (ctx, { projectId }) => {
		const { project } = await requireOwnedProject(ctx, projectId);
		const now = Date.now();
		await ctx.db.patch(project._id, { deletedAt: now, updatedAt: now });
		await ctx.scheduler.runAfter(0, internal.favorites.removeForProject, {
			projectId: project._id
		});

		return null;
	}
});

export async function requireOwnedProject(
	ctx: AuthenticatedProjectLookupCtx,
	projectId: Id<'projects'>
): Promise<{ user: Doc<'users'>; project: Doc<'projects'> }> {
	const user = await requireActiveUser(ctx);
	const project = await ctx.db.get(projectId);
	if (!project || project.deletedAt || project.userId !== user._id) {
		throw new Error('Not authorized');
	}

	return { user, project };
}

async function requireValidUnusedBanner(
	ctx: Pick<QueryCtx, 'db'>,
	storageId: Id<'_storage'>,
	contentType?: string
): Promise<void> {
	if (await findProjectUsingBanner(ctx, storageId)) {
		throw new Error('Banner image is already in use');
	}
	const metadata = await ctx.db.system.get('_storage', storageId);
	if (!contentType || !isValidStoredImage(metadata, contentType)) {
		throw new Error('Banner image is invalid');
	}
}

async function findProjectUsingBanner(
	ctx: Pick<QueryCtx, 'db'>,
	storageId: Id<'_storage'>
): Promise<Doc<'projects'> | null> {
	return await ctx.db
		.query('projects')
		.withIndex('by_bannerStorageId', (q) => q.eq('bannerStorageId', storageId))
		.first();
}

async function getOwnerProfileData(ctx: Pick<QueryCtx, 'db' | 'storage'>, createdBy: string) {
	const owner = await findOwner(ctx, createdBy);
	if (!owner) return null;

	const projects = await findProjectsByOwner(ctx, owner);

	return {
		owner,
		projects: await Promise.all(
			projects.map(async (project) => ({
				id: project._id,
				name: project.name,
				slug: project.slug,
				description: project.description ?? null,
				bannerUrl: project.bannerStorageId
					? await ctx.storage.getUrl(project.bannerStorageId)
					: null,
				updatedAt: project.updatedAt
			}))
		)
	};
}

export async function findProjectByOwnerAndSlug(
	ctx: ProjectLookupCtx,
	owner: ProjectOwner,
	projectSlug: string
): Promise<Doc<'projects'> | null> {
	const normalizedProjectSlug = projectSlug.toLowerCase();
	return owner.kind === 'user'
		? await ctx.db
				.query('projects')
				.withIndex('by_userId_and_slug_and_deletedAt', (q) =>
					q.eq('userId', owner.id).eq('slug', normalizedProjectSlug).eq('deletedAt', undefined)
				)
				.unique()
		: await ctx.db
				.query('projects')
				.withIndex('by_orgId_and_slug_and_deletedAt', (q) =>
					q.eq('orgId', owner.id).eq('slug', normalizedProjectSlug).eq('deletedAt', undefined)
				)
				.unique();
}

export async function findOwner(
	ctx: ProjectLookupCtx,
	createdBy: string
): Promise<ProjectOwner | null> {
	const slug = normalizeUsername(createdBy);

	const user = await ctx.db
		.query('users')
		.withIndex('by_username', (q) => q.eq('username', slug))
		.unique();
	if (user && !user.deletedAt && user.username) {
		return {
			kind: 'user',
			id: user._id,
			authProviderId: user.authProviderId,
			name: user.username,
			createdAt: user._creationTime
		};
	}

	const organization = await ctx.db
		.query('organizations')
		.withIndex('by_slug', (q) => q.eq('slug', slug))
		.unique();
	if (organization && !organization.deletedAt) {
		return {
			kind: 'org',
			id: organization._id,
			name: organization.name,
			createdAt: organization._creationTime
		};
	}

	return null;
}

async function findProjectsByOwner(
	ctx: ProjectLookupCtx,
	owner: ProjectOwner
): Promise<Doc<'projects'>[]> {
	return owner.kind === 'user'
		? await ctx.db
				.query('projects')
				.withIndex('by_userId_and_deletedAt_and_updatedAt', (q) =>
					q.eq('userId', owner.id).eq('deletedAt', undefined)
				)
				.order('desc')
				.take(OWNER_PROJECT_LIMIT)
		: await ctx.db
				.query('projects')
				.withIndex('by_orgId_and_deletedAt_and_updatedAt', (q) =>
					q.eq('orgId', owner.id).eq('deletedAt', undefined)
				)
				.order('desc')
				.take(OWNER_PROJECT_LIMIT);
}

function normalizeProjectName(name: string): string {
	const trimmedName = name.trim();
	if (trimmedName.length === 0) {
		throw new Error('Project name is required');
	}

	if (trimmedName.length > PROJECT_NAME_MAX_LENGTH) {
		throw new Error(`Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`);
	}

	return trimmedName;
}

function normalizeProjectDescription(description: string | undefined): string | undefined {
	const trimmedDescription = description?.trim();
	if (!trimmedDescription) return undefined;

	if (trimmedDescription.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
		throw new Error(
			`Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
		);
	}

	return trimmedDescription;
}

async function createUniqueProjectSlug(
	ctx: ProjectLookupCtx,
	userId: Id<'users'>,
	baseSlug: string
): Promise<string> {
	for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
		const candidate = appendSlugSuffix(baseSlug, attempt);
		if (!(await activeUserProjectSlugExists(ctx, userId, candidate))) {
			return candidate;
		}
	}

	throw new Error('Unable to create a unique project slug');
}

async function activeUserProjectSlugExists(
	ctx: ProjectLookupCtx,
	userId: Id<'users'>,
	slug: string
): Promise<boolean> {
	const project = await ctx.db
		.query('projects')
		.withIndex('by_userId_and_slug_and_deletedAt', (q) =>
			q.eq('userId', userId).eq('slug', slug).eq('deletedAt', undefined)
		)
		.unique();

	return project !== null;
}

function appendSlugSuffix(baseSlug: string, attempt: number): string {
	return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}
