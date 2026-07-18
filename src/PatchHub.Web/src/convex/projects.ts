import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
	internalMutation,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx
} from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';
import { createSlug, normalizeName } from './lib/strings';
import { normalizeUsername } from './lib/usernames';
import { findUserByAuthProviderId } from './users';

const OWNER_PROJECT_LIMIT = 100;
const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
const PROJECT_BANNER_MAX_BYTES = 5 * 1024 * 1024;
const PROJECT_BANNER_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_SLUG_ATTEMPTS = 1000;
const PROJECT_BANNER_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);

type ProjectLookupCtx = Pick<QueryCtx, 'db'>;
type BannerUploadFailureCode = 'upload_failed' | 'invalid_file' | 'expired';
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

export const getClaimedBannerUpload = query({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		attemptId: v.string(),
		storageId: v.id('_storage')
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		if (
			!isCurrentPendingAttempt(project, args.attemptId) ||
			project.bannerUpload.storageId !== args.storageId ||
			!project.bannerUpload.contentType
		) {
			return null;
		}

		const metadata = await getValidBannerStorageMetadata(
			ctx,
			args.storageId,
			project.bannerUpload.contentType
		);
		const url = metadata ? await ctx.storage.getUrl(args.storageId) : null;
		return metadata && url ? { url, contentType: project.bannerUpload.contentType } : null;
	}
});

export const create = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		bannerUploadAttemptId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		const user = await requireProjectUser(ctx, args.authProviderId);
		const name = normalizeProjectName(args.name);
		const description = normalizeProjectDescription(args.description);
		const slug = await createUniqueProjectSlug(ctx, user._id, createSlug(name, 'project'));
		const now = Date.now();
		const attemptId = args.bannerUploadAttemptId
			? normalizeBannerUploadAttemptId(args.bannerUploadAttemptId)
			: undefined;
		const project: {
			name: string;
			normalizedName: string;
			slug: string;
			description?: string;
			bannerUpload?:
				| { status: 'pending'; attemptId: string; startedAt: number }
				| {
						status: 'failed';
						attemptId: string;
						failedAt: number;
						errorCode: 'upload_failed';
				  };
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

		let uploadUrl: string | null = null;
		if (attemptId) {
			try {
				uploadUrl = await ctx.storage.generateUploadUrl();
				project.bannerUpload = { status: 'pending', attemptId, startedAt: now };
			} catch {
				project.bannerUpload = {
					status: 'failed',
					attemptId,
					failedAt: now,
					errorCode: 'upload_failed'
				};
			}
		}

		const id = await ctx.db.insert('projects', project);
		if (attemptId && uploadUrl) {
			await scheduleBannerUploadExpiration(ctx, id, attemptId);
		}

		return {
			id,
			name,
			slug,
			bannerUpload: attemptId && uploadUrl ? { attemptId, uploadUrl } : null
		};
	}
});

export const beginBannerUpload = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		attemptId: v.string()
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		const attemptId = normalizeBannerUploadAttemptId(args.attemptId);

		if (project.bannerUpload?.status === 'pending' && project.bannerUpload.storageId) {
			await deleteUnattachedStorage(ctx, project.bannerUpload.storageId);
		}

		const startedAt = Date.now();
		const uploadUrl = await ctx.storage.generateUploadUrl();
		await ctx.db.patch(project._id, {
			bannerUpload: { status: 'pending', attemptId, startedAt }
		});
		await scheduleBannerUploadExpiration(ctx, project._id, attemptId);

		return { attemptId, uploadUrl };
	}
});

export const claimBannerUpload = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		attemptId: v.string(),
		storageId: v.id('_storage'),
		contentType: v.string()
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		if (!isCurrentPendingAttempt(project, args.attemptId)) {
			return { status: 'stale' as const };
		}

		if (await findProjectUsingBanner(ctx, args.storageId)) {
			return { status: 'stale' as const };
		}

		const metadata = await getValidBannerStorageMetadata(ctx, args.storageId, args.contentType);
		if (!metadata) {
			await deleteUnattachedStorage(ctx, args.storageId);
			await markBannerUploadFailed(ctx, project, args.attemptId, 'invalid_file');
			return { status: 'failed' as const };
		}

		await ctx.db.patch(project._id, {
			bannerUpload: {
				status: 'pending',
				attemptId: args.attemptId,
				startedAt: project.bannerUpload.startedAt,
				storageId: args.storageId,
				contentType: args.contentType
			}
		});

		return {
			status: 'claimed' as const,
			contentType: args.contentType
		};
	}
});

export const finishBannerUpload = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		attemptId: v.string(),
		storageId: v.id('_storage'),
		outcome: v.union(v.literal('ready'), v.literal('invalid_file'), v.literal('upload_failed'))
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		if (
			!isCurrentPendingAttempt(project, args.attemptId) ||
			project.bannerUpload.storageId !== args.storageId
		) {
			return { status: 'stale' as const };
		}

		if (args.outcome !== 'ready' || !(await getValidBannerStorageMetadata(ctx, args.storageId))) {
			await deleteUnattachedStorage(ctx, args.storageId);
			await markBannerUploadFailed(
				ctx,
				project,
				args.attemptId,
				args.outcome === 'invalid_file' ? 'invalid_file' : 'upload_failed'
			);
			return { status: 'failed' as const };
		}

		const replacedStorageId = project.bannerStorageId;
		await ctx.db.patch(project._id, {
			bannerStorageId: args.storageId,
			bannerUpload: undefined,
			updatedAt: Date.now()
		});

		if (replacedStorageId && replacedStorageId !== args.storageId) {
			await deleteUnattachedStorage(ctx, replacedStorageId);
		}

		return { status: 'ready' as const };
	}
});

export const failBannerUpload = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		attemptId: v.string()
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const user = await requireProjectUser(ctx, args.authProviderId);
		const project = await requireOwnedProject(ctx, user._id, args.projectId);
		if (!isCurrentPendingAttempt(project, args.attemptId)) {
			return { status: 'stale' as const };
		}

		if (project.bannerUpload.storageId) {
			await deleteUnattachedStorage(ctx, project.bannerUpload.storageId);
		}
		await markBannerUploadFailed(ctx, project, args.attemptId, 'upload_failed');
		return { status: 'failed' as const };
	}
});

export const expireBannerUpload = internalMutation({
	args: {
		projectId: v.id('projects'),
		attemptId: v.string()
	},
	handler: async (ctx, args) => {
		const project = await ctx.db.get(args.projectId);
		if (!project || !isCurrentPendingAttempt(project, args.attemptId)) {
			return null;
		}

		if (project.bannerUpload.storageId) {
			await deleteUnattachedStorage(ctx, project.bannerUpload.storageId);
		}
		await markBannerUploadFailed(ctx, project, args.attemptId, 'expired');
		return null;
	}
});

async function requireProjectUser(
	ctx: Pick<QueryCtx, 'auth' | 'db'>,
	authProviderId: string
): Promise<Doc<'users'>> {
	const user = await findUserByAuthProviderId(ctx, authProviderId);
	if (!user || user.deletedAt) {
		throw new Error('User not found');
	}

	return user;
}

async function requireOwnedProject(
	ctx: ProjectLookupCtx,
	userId: Id<'users'>,
	projectId: Id<'projects'>
): Promise<Doc<'projects'>> {
	const project = await ctx.db.get(projectId);
	if (!project || project.deletedAt || project.userId !== userId) {
		throw new Error('Not authorized');
	}

	return project;
}

function normalizeBannerUploadAttemptId(attemptId: string): string {
	const normalized = attemptId.trim();
	if (!normalized) {
		throw new Error('Banner upload attempt is required');
	}

	return normalized;
}

function isCurrentPendingAttempt(
	project: Doc<'projects'>,
	attemptId: string
): project is Doc<'projects'> & {
	bannerUpload: {
		status: 'pending';
		attemptId: string;
		startedAt: number;
		storageId?: Id<'_storage'>;
		contentType?: string;
	};
} {
	return project.bannerUpload?.status === 'pending' && project.bannerUpload.attemptId === attemptId;
}

async function scheduleBannerUploadExpiration(
	ctx: Pick<MutationCtx, 'scheduler'>,
	projectId: Id<'projects'>,
	attemptId: string
): Promise<void> {
	await ctx.scheduler.runAfter(
		PROJECT_BANNER_UPLOAD_TIMEOUT_MS,
		internal.projects.expireBannerUpload,
		{ projectId, attemptId }
	);
}

async function getValidBannerStorageMetadata(
	ctx: Pick<QueryCtx, 'db'>,
	storageId: Id<'_storage'>,
	contentType?: string
) {
	const metadata = await ctx.db.system.get('_storage', storageId);
	if (!metadata || metadata.size === 0 || metadata.size > PROJECT_BANNER_MAX_BYTES) {
		return null;
	}

	if (
		contentType !== undefined &&
		(!PROJECT_BANNER_MIME_TYPES.has(contentType) ||
			(metadata.contentType !== undefined && metadata.contentType !== contentType))
	) {
		return null;
	}

	return metadata;
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

async function deleteUnattachedStorage(
	ctx: Pick<MutationCtx, 'db' | 'storage'>,
	storageId: Id<'_storage'>
): Promise<void> {
	if (await findProjectUsingBanner(ctx, storageId)) return;
	if (await ctx.db.system.get('_storage', storageId)) {
		await ctx.storage.delete(storageId);
	}
}

async function markBannerUploadFailed(
	ctx: Pick<MutationCtx, 'db'>,
	project: Doc<'projects'>,
	attemptId: string,
	errorCode: BannerUploadFailureCode
): Promise<void> {
	await ctx.db.patch(project._id, {
		bannerUpload: {
			status: 'failed',
			attemptId,
			failedAt: Date.now(),
			errorCode
		}
	});
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
