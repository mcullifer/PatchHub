import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';
import { createSlug, normalizeName } from './lib/strings';
import { normalizeUsername } from './lib/usernames';
import { findUserByAuthProviderId } from './users';

const OWNER_PROJECT_LIMIT = 100;
const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
const PROJECT_BANNER_MAX_BYTES = 5 * 1024 * 1024;
const MAX_SLUG_ATTEMPTS = 1000;
const PROJECT_BANNER_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);

type ProjectLookupCtx = Pick<QueryCtx, 'db'>;
type PublicOwnerProfile =
	| { kind: 'user'; name: string; createdAt: number }
	| { kind: 'org'; name: string; createdAt: number };
type ServerOwnerProfile =
	| { kind: 'user'; name: string; authProviderId: string; createdAt: number }
	| { kind: 'org'; name: string; createdAt: number };

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

export const getByOwnerAndSlug = query({
	args: { createdBy: v.string(), projectSlug: v.string() },
	handler: async (ctx, args) => {
		const owner = await findOwner(ctx, args.createdBy);
		if (!owner) return null;

		const project = await findProjectByOwnerAndSlug(ctx, owner, args.projectSlug);
		if (!project) return null;

		return {
			id: project._id,
			name: project.name,
			normalizedName: project.normalizedName,
			slug: project.slug
		};
	}
});

export const getOwnerProfile = query({
	args: { createdBy: v.string() },
	handler: async (ctx, args) => {
		const profile = await getOwnerProfileData(ctx, args.createdBy);
		if (!profile) return null;

		return {
			owner: toPublicOwnerProfile(profile.owner),
			projects: profile.projects
		};
	}
});

export const getOwnerProfileForServer = query({
	args: { secret: v.string(), createdBy: v.string() },
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		const profile = await getOwnerProfileData(ctx, args.createdBy);
		if (!profile) return null;

		return {
			owner: toServerOwnerProfile(profile.owner),
			projects: profile.projects
		};
	}
});

export const create = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		bannerStorageId: v.optional(v.id('_storage'))
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		const user = await requireProjectUser(ctx, args.authProviderId);
		if (args.bannerStorageId) {
			await validateBannerStorage(ctx, args.bannerStorageId);
		}

		const name = normalizeProjectName(args.name);
		const description = normalizeProjectDescription(args.description);
		const slug = await createUniqueProjectSlug(ctx, user._id, createSlug(name, 'project'));
		const now = Date.now();
		const project: {
			name: string;
			normalizedName: string;
			slug: string;
			description?: string;
			bannerStorageId?: Id<'_storage'>;
			userId: Id<'users'>;
			createdAt: number;
			updatedAt: number;
		} = {
			name,
			normalizedName: normalizeName(name),
			slug,
			userId: user._id,
			createdAt: now,
			updatedAt: now
		};

		if (description !== undefined) {
			project.description = description;
		}
		if (args.bannerStorageId !== undefined) {
			project.bannerStorageId = args.bannerStorageId;
		}

		const id = await ctx.db.insert('projects', project);
		return { id, name, slug };
	}
});

export const generateBannerUploadUrl = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.optional(v.id('projects'))
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);

		if (args.projectId) {
			await requireOwnedProject(ctx, user._id, args.projectId);
		}

		return await ctx.storage.generateUploadUrl();
	}
});

export const setBanner = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		storageId: v.id('_storage')
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		await validateBannerStorage(ctx, args.storageId);

		const replacedStorageId = project.bannerStorageId;
		await ctx.db.patch(project._id, {
			bannerStorageId: args.storageId,
			updatedAt: Date.now()
		});

		if (replacedStorageId && replacedStorageId !== args.storageId) {
			await ctx.storage.delete(replacedStorageId);
		}

		return null;
	}
});

export const discardBannerUpload = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		storageId: v.id('_storage'),
		projectId: v.optional(v.id('projects'))
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);

		if (args.projectId) {
			const project = await requireOwnedProject(ctx, user._id, args.projectId);
			if (project.bannerStorageId === args.storageId) {
				return null;
			}
		}

		if (await ctx.db.system.get('_storage', args.storageId)) {
			await ctx.storage.delete(args.storageId);
		}

		return null;
	}
});

async function requireProjectUser(
	ctx: Pick<MutationCtx, 'auth' | 'db'>,
	authProviderId: string
): Promise<Doc<'users'>> {
	const user = await findUserByAuthProviderId(ctx, authProviderId);
	if (!user || user.deletedAt) {
		throw new Error('User not found');
	}

	return user;
}

async function requireOwnedProject(
	ctx: Pick<MutationCtx, 'db'>,
	userId: Id<'users'>,
	projectId: Id<'projects'>
): Promise<Doc<'projects'>> {
	const project = await ctx.db.get(projectId);
	if (!project || project.deletedAt || project.userId !== userId) {
		throw new Error('Not authorized');
	}

	return project;
}

async function validateBannerStorage(
	ctx: Pick<MutationCtx, 'db'>,
	storageId: Id<'_storage'>
): Promise<void> {
	const metadata = await ctx.db.system.get('_storage', storageId);
	if (!metadata) {
		throw new Error('Banner upload was not found');
	}

	if (
		metadata.size === 0 ||
		metadata.size > PROJECT_BANNER_MAX_BYTES ||
		!metadata.contentType ||
		!PROJECT_BANNER_MIME_TYPES.has(metadata.contentType)
	) {
		throw new Error('Banner upload must be a supported image up to 5 MB');
	}
}

async function getOwnerProfileData(ctx: ProjectLookupCtx, createdBy: string) {
	const owner = await findOwner(ctx, createdBy);
	if (!owner) return null;

	const projects = await findProjectsByOwner(ctx, owner);

	return {
		owner,
		projects: projects.map((project) => ({
			id: project._id,
			name: project.name,
			slug: project.slug,
			description: project.description ?? null,
			createdAt: project.createdAt,
			updatedAt: project.updatedAt
		}))
	};
}

function toPublicOwnerProfile(owner: ProjectOwner): PublicOwnerProfile {
	if (owner.kind === 'user') {
		return {
			kind: owner.kind,
			name: owner.name,
			createdAt: owner.createdAt
		};
	}

	return {
		kind: owner.kind,
		name: owner.name,
		createdAt: owner.createdAt
	};
}

function toServerOwnerProfile(owner: ProjectOwner): ServerOwnerProfile {
	if (owner.kind === 'user') {
		return {
			kind: owner.kind,
			name: owner.name,
			authProviderId: owner.authProviderId,
			createdAt: owner.createdAt
		};
	}

	return {
		kind: owner.kind,
		name: owner.name,
		createdAt: owner.createdAt
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
			createdAt: user.createdAt
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
			createdAt: organization.createdAt
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
