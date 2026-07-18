import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { findOwner, findProjectByOwnerAndSlug, type ProjectOwner } from './projects';
import { requireServerSecret } from './lib/serverSecret';
import { createSlug } from './lib/strings';
import { findUserByAuthProviderId } from './users';

const PATCH_NOTE_LIST_LIMIT = 50;
const PATCH_NOTE_TITLE_MAX_LENGTH = 150;
const PATCH_NOTE_CONTENT_MAX_BYTES = 400_000;
const MAX_SLUG_ATTEMPTS = 1000;
const RESERVED_NOTE_SLUGS = new Set(['new']);

type PatchNoteAuthArgs = {
	secret?: string;
	authProviderId?: string;
};

type ProjectBannerDto =
	| { status: 'none'; url: null }
	| { status: 'ready'; url: string }
	| { status: 'pending'; url: string | null }
	| { status: 'failed'; url: string | null; message: string };

type PatchNoteProjectDto = {
	id: Id<'projects'>;
	name: string;
	slug: string;
	description: string | null;
	banner: ProjectBannerDto;
	ownerName: string;
	ownerKind: 'user' | 'org';
	isOwner: boolean;
};

type PatchNoteListItemDto = {
	id: Id<'patchNotes'>;
	title: string;
	slug: string;
	status: Doc<'patchNotes'>['status'];
	publishedAt: number | null;
	createdAt: number;
	updatedAt: number;
};

type PatchNoteDto = PatchNoteListItemDto & {
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

		const notes = await listVisiblePatchNotes(
			ctx,
			resolvedProject.project._id,
			resolvedProject.isOwner
		);

		return {
			project: await toProjectDto(ctx, resolvedProject),
			notes: notes.map(toPatchNoteListItemDto)
		};
	}
});

export const getByOwnerProjectAndSlug = query({
	args: {
		createdBy: v.string(),
		projectSlug: v.string(),
		noteSlug: v.string(),
		secret: v.optional(v.string()),
		authProviderId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const resolvedProject = await resolveProjectForViewer(ctx, args);
		if (!resolvedProject) return null;

		const note = await findPatchNoteByProjectAndSlug(
			ctx,
			resolvedProject.project._id,
			args.noteSlug.toLowerCase()
		);
		if (!note || !canViewNote(note, resolvedProject.isOwner)) {
			return null;
		}

		return {
			project: await toProjectDto(ctx, resolvedProject),
			note: toPatchNoteDto(note)
		};
	}
});

export const create = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		projectId: v.id('projects'),
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

		const title = normalizePatchNoteTitle(args.title);
		validatePatchNoteContent(args.content);

		const slug = await createUniqueNoteSlug(ctx, project._id, createSlug(title, 'note'));
		const now = Date.now();
		const patchNote: {
			projectId: Id<'projects'>;
			authorId: Id<'users'>;
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
			title,
			slug,
			content: args.content,
			status: args.status,
			createdAt: now,
			updatedAt: now
		};

		if (args.status === 'published') {
			patchNote.publishedAt = now;
		}

		const id = await ctx.db.insert('patchNotes', patchNote);
		await ctx.db.patch(project._id, { updatedAt: now });
		return { id, slug };
	}
});

async function resolveProjectForViewer(
	ctx: QueryCtx,
	args: { createdBy: string; projectSlug: string } & PatchNoteAuthArgs
): Promise<ResolvedProject | null> {
	const owner = await findOwner(ctx, args.createdBy);
	if (!owner) return null;

	const project = await findProjectByOwnerAndSlug(ctx, owner, args.projectSlug);
	if (!project) return null;

	const viewer = await findPatchNoteViewer(ctx, args);
	const isOwner = project.userId !== undefined && viewer?._id === project.userId;

	return { owner, project, isOwner };
}

async function findPatchNoteViewer(
	ctx: QueryCtx,
	args: PatchNoteAuthArgs
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

async function findPatchNoteByProjectAndSlug(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	slug: string
): Promise<Doc<'patchNotes'> | null> {
	return await ctx.db
		.query('patchNotes')
		.withIndex('by_projectId_and_slug_and_deletedAt', (q) =>
			q.eq('projectId', projectId).eq('slug', slug).eq('deletedAt', undefined)
		)
		.unique();
}

async function toProjectDto(
	ctx: QueryCtx,
	resolvedProject: ResolvedProject
): Promise<PatchNoteProjectDto> {
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

function toPatchNoteDto(note: Doc<'patchNotes'>): PatchNoteDto {
	return {
		...toPatchNoteListItemDto(note),
		content: note.content
	};
}

function toPatchNoteListItemDto(note: Doc<'patchNotes'>): PatchNoteListItemDto {
	return {
		id: note._id,
		title: note.title,
		slug: note.slug,
		status: note.status,
		publishedAt: note.publishedAt ?? null,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt
	};
}

function canViewNote(note: Doc<'patchNotes'>, isOwner: boolean): boolean {
	if (note.deletedAt) return false;
	if (note.status === 'published') return true;
	return isOwner && note.status === 'draft';
}

function comparePatchNotesNewestFirst(left: Doc<'patchNotes'>, right: Doc<'patchNotes'>): number {
	const leftSortAt = left.publishedAt ?? left.createdAt;
	const rightSortAt = right.publishedAt ?? right.createdAt;
	if (leftSortAt !== rightSortAt) {
		return rightSortAt - leftSortAt;
	}

	return right._creationTime - left._creationTime;
}

function normalizePatchNoteTitle(title: string): string {
	const trimmedTitle = title.trim();
	if (trimmedTitle.length === 0) {
		throw new Error('Patch note title is required');
	}

	if (trimmedTitle.length > PATCH_NOTE_TITLE_MAX_LENGTH) {
		throw new Error(`Patch note title must be at most ${PATCH_NOTE_TITLE_MAX_LENGTH} characters`);
	}

	return trimmedTitle;
}

function validatePatchNoteContent(content: string): void {
	if (new TextEncoder().encode(content).byteLength > PATCH_NOTE_CONTENT_MAX_BYTES) {
		throw new Error('Patch note content must be at most 400KB');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('Patch note content must be valid JSON');
	}

	if (!isTipTapDocument(parsed)) {
		throw new Error('Patch note content must be a TipTap doc');
	}

	if (!hasRenderableContent(parsed)) {
		throw new Error('Patch note content is empty');
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

async function createUniqueNoteSlug(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	baseSlug: string
): Promise<string> {
	for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
		const candidate = appendSlugSuffix(baseSlug, attempt);
		if (
			!RESERVED_NOTE_SLUGS.has(candidate) &&
			!(await activeNoteSlugExists(ctx, projectId, candidate))
		) {
			return candidate;
		}
	}

	throw new Error('Unable to create a unique patch note slug');
}

async function activeNoteSlugExists(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	slug: string
): Promise<boolean> {
	const note = await ctx.db
		.query('patchNotes')
		.withIndex('by_projectId_and_slug_and_deletedAt', (q) =>
			q.eq('projectId', projectId).eq('slug', slug).eq('deletedAt', undefined)
		)
		.unique();

	return note !== null;
}

function appendSlugSuffix(baseSlug: string, attempt: number): string {
	return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}

async function listVisiblePatchNotes(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	isOwner: boolean
): Promise<Doc<'patchNotes'>[]> {
	const publishedNotes = await listPublishedPatchNotes(ctx, projectId, PATCH_NOTE_LIST_LIMIT);
	if (!isOwner) return publishedNotes;

	const draftNotes = await listDraftPatchNotes(ctx, projectId, PATCH_NOTE_LIST_LIMIT);
	return [...publishedNotes, ...draftNotes]
		.sort(comparePatchNotesNewestFirst)
		.slice(0, PATCH_NOTE_LIST_LIMIT);
}

async function listPublishedPatchNotes(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	limit: number
): Promise<Doc<'patchNotes'>[]> {
	return await ctx.db
		.query('patchNotes')
		.withIndex('by_projectId_and_deletedAt_and_status_and_publishedAt', (q) =>
			q.eq('projectId', projectId).eq('deletedAt', undefined).eq('status', 'published')
		)
		.order('desc')
		.take(limit);
}

async function listDraftPatchNotes(
	ctx: QueryCtx,
	projectId: Id<'projects'>,
	limit: number
): Promise<Doc<'patchNotes'>[]> {
	return await ctx.db
		.query('patchNotes')
		.withIndex('by_projectId_and_deletedAt_and_status_and_createdAt', (q) =>
			q.eq('projectId', projectId).eq('deletedAt', undefined).eq('status', 'draft')
		)
		.order('desc')
		.take(limit);
}
