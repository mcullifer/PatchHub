import { command, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { getAuthContext, requireInternalUser } from '$lib/server/auth/AuthContext';
import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

async function viewerAuthArgs() {
	const { workosUser } = await getAuthContext(getRequestEvent());
	return workosUser ? { secret: getConvexServerSecret(), authProviderId: workosUser.id } : {};
}

const ownerProjectArgs = v.object({
	createdBy: v.string(),
	projectSlug: v.string()
});

export const getProjectPosts = query(ownerProjectArgs, async ({ createdBy, projectSlug }) => {
	const result = await createConvexClient().query(api.projectPosts.listByOwnerAndProject, {
		createdBy,
		projectSlug,
		...(await viewerAuthArgs())
	});
	if (!result) error(404, 'Not found');
	return result;
});

export const getProjectPost = query(
	v.object({ createdBy: v.string(), projectSlug: v.string(), postSlug: v.string() }),
	async ({ createdBy, projectSlug, postSlug }) => {
		const result = await createConvexClient().query(api.projectPosts.getByOwnerProjectAndSlug, {
			createdBy,
			projectSlug,
			postSlug,
			...(await viewerAuthArgs())
		});
		if (!result) error(404, 'Not found');
		return result;
	}
);

export const getOwnedProject = query(ownerProjectArgs, async ({ createdBy, projectSlug }) => {
	const result = await createConvexClient().query(api.projectPosts.listByOwnerAndProject, {
		createdBy,
		projectSlug,
		...(await viewerAuthArgs())
	});
	if (!result || !result.project.isOwner) error(404, 'Not found');
	return {
		project: {
			id: result.project.id,
			name: result.project.name,
			slug: result.project.slug
		}
	};
});

const PROJECT_POST_TITLE_MAX_LENGTH = 150;
const PROJECT_POST_CONTENT_MAX_LENGTH = 400_000;

const projectPostKindSchema = v.picklist(['patch_notes', 'announcement']);
const projectPostTitleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Post title is required'),
	v.maxLength(
		PROJECT_POST_TITLE_MAX_LENGTH,
		`Post title must be at most ${PROJECT_POST_TITLE_MAX_LENGTH} characters`
	)
);
const projectPostContentSchema = v.pipe(
	v.string(),
	v.maxLength(
		PROJECT_POST_CONTENT_MAX_LENGTH,
		`Post content must be at most ${PROJECT_POST_CONTENT_MAX_LENGTH} characters`
	)
);

const createProjectPostSchema = v.object({
	projectId: v.string(),
	kind: projectPostKindSchema,
	title: projectPostTitleSchema,
	content: projectPostContentSchema,
	status: v.picklist(['draft', 'published'])
});

const updateProjectPostSchema = v.object({
	postId: v.string(),
	kind: projectPostKindSchema,
	title: projectPostTitleSchema,
	content: projectPostContentSchema
});

export const createProjectPost = command(createProjectPostSchema, async (input) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	let projectPost: { slug: string };
	try {
		projectPost = await createConvexClient().mutation(api.projectPosts.create, {
			secret: getConvexServerSecret(),
			authProviderId: dbUser.authProviderId,
			projectId: input.projectId as Id<'projects'>,
			kind: input.kind,
			title: input.title,
			content: input.content,
			status: input.status
		});
	} catch (mutationError) {
		if (mutationError instanceof Error && mutationError.message.includes('Too many new posts')) {
			error(429, 'Too many new posts — please try again later.');
		}
		throw mutationError;
	}

	await requested(getProjectPosts, 1).refreshAll();

	return { slug: projectPost.slug };
});

export const updateProjectPost = command(updateProjectPostSchema, async (input) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	const projectPost = await createConvexClient().mutation(api.projectPosts.update, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		postId: input.postId as Id<'projectPosts'>,
		kind: input.kind,
		title: input.title,
		content: input.content
	});

	await requested(getProjectPosts, 1).refreshAll();
	await requested(getProjectPost, 1).refreshAll();

	return { slug: projectPost.slug };
});

export const setProjectPostStatus = command(
	v.object({
		postId: v.string(),
		status: v.picklist(['draft', 'published'])
	}),
	async ({ postId, status }) => {
		const event = getRequestEvent();
		const dbUser = await requireInternalUser(event);

		const result = await createConvexClient().mutation(api.projectPosts.setStatus, {
			secret: getConvexServerSecret(),
			authProviderId: dbUser.authProviderId,
			postId: postId as Id<'projectPosts'>,
			status
		});

		await requested(getProjectPosts, 1).refreshAll();
		await requested(getProjectPost, 1).refreshAll();

		return result;
	}
);

export const deleteProjectPost = command(v.object({ postId: v.string() }), async ({ postId }) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await createConvexClient().mutation(api.projectPosts.remove, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		postId: postId as Id<'projectPosts'>
	});

	await requested(getProjectPosts, 1).refreshAll();

	return null;
});
