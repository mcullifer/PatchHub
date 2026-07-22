import { command, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import {
	PROJECT_POST_CONTENT_MAX_BYTES,
	PROJECT_POST_TITLE_MAX_LENGTH
} from '$convex/lib/contentLimits';
import { captureServerEvent } from '$lib/server/analytics';
import { requireAuth } from '$lib/server/auth/authContext';
import { createAuthenticatedConvexClient, createViewerConvexClient } from '$lib/server/convex';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

const ownerProjectSchema = v.object({
	createdBy: v.string(),
	projectSlug: v.string()
});
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
	v.check(
		(content) => new TextEncoder().encode(content).byteLength <= PROJECT_POST_CONTENT_MAX_BYTES,
		'Post content must be at most 400KB'
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

const projectPostSchema = v.object({
	createdBy: v.string(),
	projectSlug: v.string(),
	postSlug: v.string()
});

const setProjectPostStatusSchema = v.object({
	postId: v.string(),
	status: v.picklist(['draft', 'published'])
});

const deleteProjectPostSchema = v.object({ postId: v.string() });

export const getProjectPosts = query(ownerProjectSchema, async ({ createdBy, projectSlug }) => {
	const convex = createViewerConvexClient(getRequestEvent());
	const result = await convex.query(api.projectPosts.listForProject, {
		createdBy,
		projectSlug
	});
	if (!result) error(404, 'Not found');
	return result;
});

export const getProjectPost = query(
	projectPostSchema,
	async ({ createdBy, projectSlug, postSlug }) => {
		const convex = createViewerConvexClient(getRequestEvent());
		const result = await convex.query(api.projectPosts.getForProject, {
			createdBy,
			projectSlug,
			postSlug
		});
		if (!result) error(404, 'Not found');
		return result;
	}
);

export const getOwnedProject = query(ownerProjectSchema, async ({ createdBy, projectSlug }) => {
	const event = getRequestEvent();
	requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);
	const project = await convex.query(api.projects.getOwnedBySlug, {
		createdBy,
		projectSlug
	});
	if (!project) error(404, 'Not found');
	return project;
});

export const createProjectPost = command(createProjectPostSchema, async (input) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	let projectPost: { slug: string };
	try {
		projectPost = await convex.mutation(api.projectPosts.create, {
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
	await captureServerEvent(event, user.id, {
		name: 'project post created',
		properties: { kind: input.kind, status: input.status }
	});

	await requested(getProjectPosts, 1).refreshAll();

	return { slug: projectPost.slug };
});

export const updateProjectPost = command(updateProjectPostSchema, async (input) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	const projectPost = await convex.mutation(api.projectPosts.update, {
		postId: input.postId as Id<'projectPosts'>,
		kind: input.kind,
		title: input.title,
		content: input.content
	});
	await captureServerEvent(event, user.id, {
		name: 'project post updated',
		properties: { kind: input.kind }
	});

	await requested(getProjectPosts, 1).refreshAll();
	await requested(getProjectPost, 1).refreshAll();

	return { slug: projectPost.slug };
});

export const setProjectPostStatus = command(
	setProjectPostStatusSchema,
	async ({ postId, status }) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createAuthenticatedConvexClient(event);

		const result = await convex.mutation(api.projectPosts.setStatus, {
			postId: postId as Id<'projectPosts'>,
			status
		});
		await captureServerEvent(event, user.id, {
			name: 'project post status changed',
			properties: { status }
		});

		await requested(getProjectPosts, 1).refreshAll();
		await requested(getProjectPost, 1).refreshAll();

		return result;
	}
);

export const deleteProjectPost = command(deleteProjectPostSchema, async ({ postId }) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	await convex.mutation(api.projectPosts.remove, {
		postId: postId as Id<'projectPosts'>
	});
	await captureServerEvent(event, user.id, {
		name: 'project post deleted'
	});

	await requested(getProjectPosts, 1).refreshAll();

	return null;
});
