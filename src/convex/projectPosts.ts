import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { PROJECT_POST_CONTENT_MAX_BYTES, PROJECT_POST_TITLE_MAX_LENGTH } from './lib/contentLimits';
import { rateLimiter } from './lib/rateLimits';
import { createSlug } from './lib/strings';
import {
	findOwner,
	findProjectByOwnerAndSlug,
	requireOwnedProject,
	type ProjectOwner
} from './projects';
import { projectPostKind } from './schema';

const PROJECT_POST_LIST_LIMIT = 50;
const MAX_SLUG_ATTEMPTS = 1000;
const RESERVED_POST_SLUGS = new Set(['new']);

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
	owner: {
		id: ProjectOwner['id'];
		name: string;
	};
};

type ProjectPostListItemDto = {
	id: Id<'projectPosts'>;
	kind: Doc<'projectPosts'>['kind'];
	title: string;
	slug: string;
	status: Doc<'projectPosts'>['status'];
	publishedAt: number | null;
	createdAt: number;
};

type ProjectPostDto = ProjectPostListItemDto & {
	content: string;
};

type ResolvedProject = {
	owner: ProjectOwner;
	project: Doc<'projects'>;
};

export const listForProject = query({
	args: {
		createdBy: v.string(),
		projectSlug: v.string()
	},
	handler: async (ctx, args) => {
		const resolvedProject = await resolveProject(ctx, args);
		if (!resolvedProject) return null;
		const canViewDrafts = await isAuthenticatedOwner(ctx, resolvedProject.owner);

		const posts = await listVisibleProjectPosts(ctx, resolvedProject.project._id, canViewDrafts);

		return {
			project: await toProjectDto(ctx, resolvedProject, canViewDrafts),
			posts: posts.map(toProjectPostListItemDto)
		};
	}
});

export const getForProject = query({
	args: {
		createdBy: v.string(),
		projectSlug: v.string(),
		postSlug: v.string()
	},
	handler: async (ctx, args) => {
		const resolvedProject = await resolveProject(ctx, args);
		if (!resolvedProject) return null;
		const canViewDraft = await isAuthenticatedOwner(ctx, resolvedProject.owner);

		const post = await findProjectPostByProjectAndSlug(
			ctx,
			resolvedProject.project._id,
			args.postSlug.toLowerCase()
		);
		if (!post || !canViewPost(post, canViewDraft)) {
			return null;
		}

		return {
			project: await toProjectDto(ctx, resolvedProject, canViewDraft),
			post: toProjectPostDto(post)
		};
	}
});

export const create = mutation({
	args: {
		projectId: v.id('projects'),
		kind: projectPostKind,
		title: v.string(),
		content: v.string(),
		status: v.union(v.literal('draft'), v.literal('published'))
	},
	handler: async (ctx, args) => {
		const { user, project } = await requireOwnedProject(ctx, args.projectId);

		const rateLimit = await rateLimiter.limit(ctx, 'createProjectPost', { key: user._id });
		if (!rateLimit.ok) {
			throw new Error('Too many new posts — please try again later.');
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
			updatedAt: number;
		} = {
			projectId: project._id,
			authorId: user._id,
			kind: args.kind,
			title,
			slug,
			content: args.content,
			status: args.status,
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

export const update = mutation({
	args: {
		postId: v.id('projectPosts'),
		kind: projectPostKind,
		title: v.string(),
		content: v.string()
	},
	handler: async (ctx, args) => {
		const { post, project } = await requireOwnedActivePost(ctx, args.postId);
		const title = normalizeProjectPostTitle(args.title);
		validateProjectPostContent(args.content);
		const now = Date.now();
		await ctx.db.patch(post._id, {
			kind: args.kind,
			title,
			content: args.content,
			updatedAt: now
		});
		await ctx.db.patch(project._id, { updatedAt: now });

		return { slug: post.slug };
	}
});

export const setStatus = mutation({
	args: {
		postId: v.id('projectPosts'),
		status: v.union(v.literal('draft'), v.literal('published'))
	},
	handler: async (ctx, args) => {
		const { post, project } = await requireOwnedActivePost(ctx, args.postId);
		if (post.status === args.status) {
			return {
				slug: post.slug,
				status: args.status,
				publishedAt: post.publishedAt ?? null
			};
		}

		const now = Date.now();
		const publishedAt = args.status === 'published' ? now : undefined;
		await ctx.db.patch(post._id, {
			status: args.status,
			publishedAt,
			updatedAt: now
		});
		await ctx.db.patch(project._id, { updatedAt: now });

		return { slug: post.slug, status: args.status, publishedAt: publishedAt ?? null };
	}
});

export const remove = mutation({
	args: {
		postId: v.id('projectPosts')
	},
	handler: async (ctx, args) => {
		const { post, project } = await requireOwnedActivePost(ctx, args.postId);
		const now = Date.now();
		await ctx.db.patch(post._id, { deletedAt: now, updatedAt: now });
		await ctx.db.patch(project._id, { updatedAt: now });
		return null;
	}
});

async function requireOwnedActivePost(
	ctx: Pick<MutationCtx, 'auth' | 'db'>,
	postId: Id<'projectPosts'>
): Promise<{ post: Doc<'projectPosts'>; project: Doc<'projects'> }> {
	const post = await ctx.db.get(postId);
	if (!post || post.deletedAt) {
		throw new Error('Not authorized');
	}

	const { project } = await requireOwnedProject(ctx, post.projectId);

	return { post, project };
}

async function resolveProject(
	ctx: QueryCtx,
	args: { createdBy: string; projectSlug: string }
): Promise<ResolvedProject | null> {
	const owner = await findOwner(ctx, args.createdBy);
	if (!owner) return null;

	const project = await findProjectByOwnerAndSlug(ctx, owner, args.projectSlug);
	if (!project) return null;

	return { owner, project };
}

async function isAuthenticatedOwner(ctx: Pick<QueryCtx, 'auth'>, owner: ProjectOwner) {
	if (owner.kind !== 'user') return false;

	const identity = await ctx.auth.getUserIdentity();
	return identity?.subject === owner.authProviderId;
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
	resolvedProject: ResolvedProject,
	showBannerFailure: boolean
): Promise<ProjectPostProjectDto> {
	const bannerUrl = resolvedProject.project.bannerStorageId
		? await ctx.storage.getUrl(resolvedProject.project.bannerStorageId)
		: null;

	return {
		id: resolvedProject.project._id,
		name: resolvedProject.project.name,
		slug: resolvedProject.project.slug,
		description: resolvedProject.project.description ?? null,
		banner: toProjectBannerDto(resolvedProject.project, bannerUrl, showBannerFailure),
		owner: {
			id: resolvedProject.owner.id,
			name: resolvedProject.owner.name
		}
	};
}

function toProjectBannerDto(
	project: Doc<'projects'>,
	url: string | null,
	showFailure: boolean
): ProjectBannerDto {
	if (project.bannerUpload?.status === 'pending') {
		return { status: 'pending', url };
	}

	if (project.bannerUpload?.status === 'failed' && showFailure) {
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
		createdAt: post._creationTime
	};
}

function canViewPost(post: Doc<'projectPosts'>, canViewDraft: boolean): boolean {
	if (post.deletedAt) return false;
	if (post.status === 'published') return true;
	return canViewDraft && post.status === 'draft';
}

function compareProjectPostsNewestFirst(
	left: Doc<'projectPosts'>,
	right: Doc<'projectPosts'>
): number {
	const leftSortAt = left.publishedAt ?? left._creationTime;
	const rightSortAt = right.publishedAt ?? right._creationTime;
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
		if (!RESERVED_POST_SLUGS.has(candidate) && !(await postSlugExists(ctx, projectId, candidate))) {
			return candidate;
		}
	}

	throw new Error('Unable to create a unique post slug');
}

async function postSlugExists(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	slug: string
): Promise<boolean> {
	const post = await ctx.db
		.query('projectPosts')
		.withIndex('by_projectId_and_slug_and_deletedAt', (q) =>
			q.eq('projectId', projectId).eq('slug', slug)
		)
		.first();

	return post !== null;
}

function appendSlugSuffix(baseSlug: string, attempt: number): string {
	return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}

async function listVisibleProjectPosts(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	includeDrafts: boolean
): Promise<Doc<'projectPosts'>[]> {
	const publishedPosts = await listPublishedProjectPosts(ctx, projectId, PROJECT_POST_LIST_LIMIT);
	if (!includeDrafts) return publishedPosts;

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
		.withIndex('by_projectId_and_deletedAt_and_status', (q) =>
			q.eq('projectId', projectId).eq('deletedAt', undefined).eq('status', 'draft')
		)
		.order('desc')
		.take(limit);
}
