import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { findOwner, findProjectByOwnerAndSlug, type ProjectOwner } from './projects';
import { requireServerSecret } from './lib/serverSecret';
import { createSlug } from './lib/strings';
import { projectPostKind } from './schema';
import { findUserByAuthProviderId } from './users';

const PROJECT_POST_LIST_LIMIT = 50;
const PROJECT_POST_TITLE_MAX_LENGTH = 150;
const PROJECT_POST_CONTENT_MAX_BYTES = 400_000;
const MAX_SLUG_ATTEMPTS = 1000;
const RESERVED_POST_SLUGS = new Set(['new']);

type ProjectPostAuthArgs = {
	secret?: string;
	authProviderId?: string;
};

type ProjectBannerDto =
	| { status: 'none'; url: null }
	| { status: 'ready'; url: string }
	| { status: 'pending'; url: string | null }
	| { status: 'failed'; url: string | null; message: string };

type ProjectPostProjectDto = {
	id: Id<'projects'>;
	name: string;
	slug: string;
	description: string | null;
	banner: ProjectBannerDto;
	ownerName: string;
	ownerKind: 'user' | 'org';
	isOwner: boolean;
};

type ProjectPostListItemDto = {
	id: Id<'projectPosts'>;
	kind: Doc<'projectPosts'>['kind'];
	title: string;
	slug: string;
	status: Doc<'projectPosts'>['status'];
	publishedAt: number | null;
	createdAt: number;
	updatedAt: number;
};

type ProjectPostDto = ProjectPostListItemDto & {
	content: string;
};

type ResolvedProject = {
	owner: ProjectOwner;
	project: Doc<'projects'>;
	isOwner: boolean;
};

export const listByOwnerAndProject = query({
	args: {
		createdBy: v.string(),
		projectSlug: v.string(),
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const resolvedProject = await resolveProjectForViewer(ctx, args);
		if (!resolvedProject) return null;

		const posts = await listVisibleProjectPosts(
			ctx,
			resolvedProject.project._id,
			resolvedProject.isOwner
		);

		return {
			project: await toProjectDto(ctx, resolvedProject),
			posts: posts.map(toProjectPostListItemDto)
		};
	}
});

export const getByOwnerProjectAndSlug = query({
	args: {
		createdBy: v.string(),
		projectSlug: v.string(),
		postSlug: v.string(),
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const resolvedProject = await resolveProjectForViewer(ctx, args);
		if (!resolvedProject) return null;

		const post = await findProjectPostByProjectAndSlug(
			ctx,
			resolvedProject.project._id,
			args.postSlug.toLowerCase()
		);
		if (!post || !canViewPost(post, resolvedProject.isOwner)) {
			return null;
		}

		return {
			project: await toProjectDto(ctx, resolvedProject),
			post: toProjectPostDto(post)
		};
	}
});

export const create = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
		kind: projectPostKind,
		title: v.string(),
		content: v.string(),
		status: v.union(v.literal('draft'), v.literal('published'))
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);

		const user = await findUserByAuthProviderId(ctx, args.authProviderId);
		if (!user || user.deletedAt) {
			throw new Error('User not found');
		}

		const project = await ctx.db.get(args.projectId);
		if (!project || project.deletedAt || project.userId !== user._id) {
			throw new Error('Not authorized');
		}

		const title = normalizeProjectPostTitle(args.title);
		validateProjectPostContent(args.content);

		const slug = await createUniquePostSlug(ctx, project._id, createSlug(title, 'post'));
		const now = Date.now();
		const projectPost: {
			projectId: Id<'projects'>;
			authorId: Id<'users'>;
			kind: Doc<'projectPosts'>['kind'];
			title: string;
			slug: string;
			content: string;
			status: 'draft' | 'published';
			publishedAt?: number;
			createdAt: number;
			updatedAt: number;
		} = {
			projectId: project._id,
			authorId: user._id,
			kind: args.kind,
			title,
			slug,
			content: args.content,
			status: args.status,
			createdAt: now,
			updatedAt: now
		};

		if (args.status === 'published') {
			projectPost.publishedAt = now;
		}

		const id = await ctx.db.insert('projectPosts', projectPost);
		await ctx.db.patch(project._id, { updatedAt: now });
		return { id, slug };
	}
});

async function resolveProjectForViewer(
	ctx: QueryCtx,
	args: { createdBy: string; projectSlug: string } & ProjectPostAuthArgs
): Promise<ResolvedProject | null> {
	const owner = await findOwner(ctx, args.createdBy);
	if (!owner) return null;

	const project = await findProjectByOwnerAndSlug(ctx, owner, args.projectSlug);
	if (!project) return null;

	const viewer = await findProjectPostViewer(ctx, args);
	const isOwner = project.userId !== undefined && viewer?._id === project.userId;

	return { owner, project, isOwner };
}

async function findProjectPostViewer(
	ctx: QueryCtx,
	args: ProjectPostAuthArgs
): Promise<Doc<'users'> | null> {
	if (args.secret === undefined && args.authProviderId === undefined) {
		return null;
	}

	if (!args.secret || !args.authProviderId) {
		throw new Error('Unauthorized');
	}

	requireServerSecret(args.secret);

	const user = await findUserByAuthProviderId(ctx, args.authProviderId);
	return user && !user.deletedAt ? user : null;
}

async function findProjectPostByProjectAndSlug(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	slug: string
): Promise<Doc<'projectPosts'> | null> {
	return await ctx.db
		.query('projectPosts')
		.withIndex('by_projectId_and_slug_and_deletedAt', (q) =>
			q.eq('projectId', projectId).eq('slug', slug).eq('deletedAt', undefined)
		)
		.unique();
}

async function toProjectDto(
	ctx: QueryCtx,
	resolvedProject: ResolvedProject
): Promise<ProjectPostProjectDto> {
	const bannerUrl = resolvedProject.project.bannerStorageId
		? await ctx.storage.getUrl(resolvedProject.project.bannerStorageId)
		: null;

	return {
		id: resolvedProject.project._id,
		name: resolvedProject.project.name,
		slug: resolvedProject.project.slug,
		description: resolvedProject.project.description ?? null,
		banner: toProjectBannerDto(resolvedProject.project, bannerUrl, resolvedProject.isOwner),
		ownerName: resolvedProject.owner.name,
		ownerKind: resolvedProject.owner.kind,
		isOwner: resolvedProject.isOwner
	};
}

function toProjectBannerDto(
	project: Doc<'projects'>,
	url: string | null,
	isOwner: boolean
): ProjectBannerDto {
	if (project.bannerUpload?.status === 'pending') {
		return { status: 'pending', url };
	}

	if (project.bannerUpload?.status === 'failed' && isOwner) {
		return {
			status: 'failed',
			url,
			message: getBannerUploadErrorMessage(project.bannerUpload.errorCode)
		};
	}

	return url ? { status: 'ready', url } : { status: 'none', url: null };
}

function getBannerUploadErrorMessage(errorCode: 'upload_failed' | 'invalid_file' | 'expired') {
	switch (errorCode) {
		case 'invalid_file':
			return 'The banner image was not valid.';
		case 'expired':
			return 'The banner upload expired.';
		case 'upload_failed':
			return 'The banner upload failed.';
	}
}

function toProjectPostDto(post: Doc<'projectPosts'>): ProjectPostDto {
	return {
		...toProjectPostListItemDto(post),
		content: post.content
	};
}

function toProjectPostListItemDto(post: Doc<'projectPosts'>): ProjectPostListItemDto {
	return {
		id: post._id,
		kind: post.kind,
		title: post.title,
		slug: post.slug,
		status: post.status,
		publishedAt: post.publishedAt ?? null,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt
	};
}

function canViewPost(post: Doc<'projectPosts'>, isOwner: boolean): boolean {
	if (post.deletedAt) return false;
	if (post.status === 'published') return true;
	return isOwner && post.status === 'draft';
}

function compareProjectPostsNewestFirst(
	left: Doc<'projectPosts'>,
	right: Doc<'projectPosts'>
): number {
	const leftSortAt = left.publishedAt ?? left.createdAt;
	const rightSortAt = right.publishedAt ?? right.createdAt;
	if (leftSortAt !== rightSortAt) {
		return rightSortAt - leftSortAt;
	}

	return right._creationTime - left._creationTime;
}

function normalizeProjectPostTitle(title: string): string {
	const trimmedTitle = title.trim();
	if (trimmedTitle.length === 0) {
		throw new Error('Post title is required');
	}

	if (trimmedTitle.length > PROJECT_POST_TITLE_MAX_LENGTH) {
		throw new Error(`Post title must be at most ${PROJECT_POST_TITLE_MAX_LENGTH} characters`);
	}

	return trimmedTitle;
}

function validateProjectPostContent(content: string): void {
	if (new TextEncoder().encode(content).byteLength > PROJECT_POST_CONTENT_MAX_BYTES) {
		throw new Error('Post content must be at most 400KB');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('Post content must be valid JSON');
	}

	if (!isTipTapDocument(parsed)) {
		throw new Error('Post content must be a TipTap doc');
	}

	if (!hasRenderableContent(parsed)) {
		throw new Error('Post content is empty');
	}
}

// Node types that count as content without any text (matches the editor's insertable atoms)
const RENDERABLE_ATOM_TYPES = new Set(['image', 'horizontalRule']);

function hasRenderableContent(node: unknown): boolean {
	if (typeof node !== 'object' || node === null) return false;

	const { type, text, content } = node as { type?: unknown; text?: unknown; content?: unknown };
	if (typeof text === 'string' && text.trim().length > 0) return true;
	if (typeof type === 'string' && RENDERABLE_ATOM_TYPES.has(type)) return true;

	return Array.isArray(content) && content.some(hasRenderableContent);
}

function isTipTapDocument(value: unknown): value is { type: 'doc' } {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		'type' in value &&
		(value as { type: unknown }).type === 'doc'
	);
}

async function createUniquePostSlug(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	baseSlug: string
): Promise<string> {
	for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
		const candidate = appendSlugSuffix(baseSlug, attempt);
		if (
			!RESERVED_POST_SLUGS.has(candidate) &&
			!(await activePostSlugExists(ctx, projectId, candidate))
		) {
			return candidate;
		}
	}

	throw new Error('Unable to create a unique post slug');
}

async function activePostSlugExists(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	slug: string
): Promise<boolean> {
	const post = await ctx.db
		.query('projectPosts')
		.withIndex('by_projectId_and_slug_and_deletedAt', (q) =>
			q.eq('projectId', projectId).eq('slug', slug).eq('deletedAt', undefined)
		)
		.unique();

	return post !== null;
}

function appendSlugSuffix(baseSlug: string, attempt: number): string {
	return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}

async function listVisibleProjectPosts(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	isOwner: boolean
): Promise<Doc<'projectPosts'>[]> {
	const publishedPosts = await listPublishedProjectPosts(ctx, projectId, PROJECT_POST_LIST_LIMIT);
	if (!isOwner) return publishedPosts;

	const draftPosts = await listDraftProjectPosts(ctx, projectId, PROJECT_POST_LIST_LIMIT);
	return [...publishedPosts, ...draftPosts]
		.sort(compareProjectPostsNewestFirst)
		.slice(0, PROJECT_POST_LIST_LIMIT);
}

async function listPublishedProjectPosts(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	limit: number
): Promise<Doc<'projectPosts'>[]> {
	return await ctx.db
		.query('projectPosts')
		.withIndex('by_projectId_and_deletedAt_and_status_and_publishedAt', (q) =>
			q.eq('projectId', projectId).eq('deletedAt', undefined).eq('status', 'published')
		)
		.order('desc')
		.take(limit);
}

async function listDraftProjectPosts(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	limit: number
): Promise<Doc<'projectPosts'>[]> {
	return await ctx.db
		.query('projectPosts')
		.withIndex('by_projectId_and_deletedAt_and_status_and_createdAt', (q) =>
			q.eq('projectId', projectId).eq('deletedAt', undefined).eq('status', 'draft')
		)
		.order('desc')
		.take(limit);
}
