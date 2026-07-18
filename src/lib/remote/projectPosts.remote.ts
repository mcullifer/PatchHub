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

const createProjectPostSchema = v.object({
	projectId: v.string(),
	kind: v.picklist(['patch_notes', 'announcement']),
	title: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Post title is required'),
		v.maxLength(
			PROJECT_POST_TITLE_MAX_LENGTH,
			`Post title must be at most ${PROJECT_POST_TITLE_MAX_LENGTH} characters`
		)
	),
	content: v.pipe(
		v.string(),
		v.maxLength(
			PROJECT_POST_CONTENT_MAX_LENGTH,
			`Post content must be at most ${PROJECT_POST_CONTENT_MAX_LENGTH} characters`
		)
	),
	status: v.picklist(['draft', 'published'])
});

export const createProjectPost = command(createProjectPostSchema, async (input) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	const projectPost = await createConvexClient().mutation(api.projectPosts.create, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		projectId: input.projectId as Id<'projects'>,
		kind: input.kind,
		title: input.title,
		content: input.content,
		status: input.status
	});

	await requested(getProjectPosts, 1).refreshAll();

	return { slug: projectPost.slug };
});
