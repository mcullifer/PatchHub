import { command, form, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from '$convex/lib/contentLimits';
import { captureServerEvent } from '$lib/server/analytics';
import { getAuthContext, requireAuth } from '$lib/server/auth/authContext';
import { createConvexClient, generateConvexBannerUploadUrl } from '$lib/server/convex';
import { loadOwnerProfile } from '$lib/server/projects/ownerProfile';
import { error, invalid } from '@sveltejs/kit';
import * as v from 'valibot';
import { getFavorites } from './favorites.remote';
import { getProjectPosts } from './projectPosts.remote';

const ownerSlugSchema = v.string();
const projectNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Project name is required'),
	v.maxLength(
		PROJECT_NAME_MAX_LENGTH,
		`Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`
	)
);
const projectDescriptionSchema = v.optional(
	v.pipe(
		v.string(),
		v.trim(),
		v.maxLength(
			PROJECT_DESCRIPTION_MAX_LENGTH,
			`Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
		)
	)
);

const createProjectSchema = v.object({
	name: projectNameSchema,
	description: projectDescriptionSchema,
	bannerFile: v.optional(v.file()),
	bannerStorageId: v.optional(v.string()),
	bannerContentType: v.optional(v.string())
});

const updateProjectSchema = v.object({
	projectId: v.string(),
	name: projectNameSchema,
	description: projectDescriptionSchema,
	bannerFile: v.optional(v.file()),
	bannerStorageId: v.optional(v.string()),
	bannerContentType: v.optional(v.string())
});

const projectIdSchema = v.object({
	projectId: v.string()
});

export const getOwnerProfile = query(ownerSlugSchema, async (createdBy) => {
	return await loadOwnerProfile(getRequestEvent(), createdBy);
});

export const createProject = form(
	createProjectSchema,
	async ({ name, description, bannerFile, bannerStorageId, bannerContentType }, issue) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);
		if (bannerFile?.size) {
			invalid(issue.bannerFile('Unable to upload the attached banner directly'));
		}

		try {
			const project = await convex.mutation(api.projects.create, {
				name,
				description: description || undefined,
				bannerStorageId: (bannerStorageId || undefined) as Id<'_storage'> | undefined,
				bannerContentType: bannerContentType || undefined
			});
			await captureServerEvent(event, user.id, {
				name: 'project created',
				properties: { banner_uploaded: Boolean(bannerStorageId) }
			});

			await requested(getOwnerProfile, 1).refreshAll();
			return project;
		} catch (mutationError) {
			if (shouldRethrowProjectCreateError(mutationError)) {
				throw mutationError;
			}
			if (getErrorMessage(mutationError).includes('Banner image')) {
				invalid(issue.bannerFile('Banner image is invalid'));
			}

			const message = getProjectCreateErrorMessage(mutationError);
			if (message.startsWith('Project description')) {
				invalid(issue.description(message));
			}

			invalid(issue.name(message));
		}
	}
);

export const updateProject = form(
	updateProjectSchema,
	async (
		{ projectId, name, description, bannerFile, bannerStorageId, bannerContentType },
		issue
	) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);
		if (bannerFile?.size) {
			invalid(issue.bannerFile('Unable to upload the attached banner directly'));
		}

		let project: { slug: string };
		try {
			project = await convex.mutation(api.projects.update, {
				projectId: projectId as Id<'projects'>,
				name,
				description: description || undefined,
				bannerStorageId: (bannerStorageId || undefined) as Id<'_storage'> | undefined,
				bannerContentType: bannerContentType || undefined
			});
		} catch (mutationError) {
			if (getErrorMessage(mutationError).includes('Banner image')) {
				invalid(issue.bannerFile('Banner image is invalid'));
			}
			throw mutationError;
		}
		await captureServerEvent(event, user.id, {
			name: 'project updated',
			properties: { banner_uploaded: Boolean(bannerStorageId) }
		});

		await Promise.all([
			requested(getOwnerProfile, 1).refreshAll(),
			requested(getProjectPosts, 1).refreshAll(),
			requested(getFavorites, 1).refreshAll()
		]);

		return project;
	}
);

export const deleteProject = command(projectIdSchema, async ({ projectId }) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createConvexClient(event);

	await convex.mutation(api.projects.remove, {
		projectId: projectId as Id<'projects'>
	});
	await captureServerEvent(event, user.id, { name: 'project deleted' });

	await Promise.all([
		requested(getOwnerProfile, 1).refreshAll(),
		requested(getFavorites, 1).refreshAll()
	]);

	return null;
});

export const generateProjectBannerUploadUrl = command(async () => {
	const event = getRequestEvent();
	requireAuth(event);
	const { user } = await getAuthContext(event);
	if (!user?.username) error(403, 'Account setup is required');

	return await generateConvexBannerUploadUrl(event);
});

function shouldRethrowProjectCreateError(error: unknown): boolean {
	const message = getErrorMessage(error);
	return (
		message.includes('Unauthorized') ||
		message.includes('Not authenticated') ||
		message.includes('Account setup is required') ||
		message.includes('User not found')
	);
}

function getProjectCreateErrorMessage(error: unknown): string {
	const message = getErrorMessage(error);

	if (message.includes('Project name is required')) {
		return 'Project name is required';
	}

	if (message.includes(`Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`)) {
		return `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`;
	}

	if (
		message.includes(
			`Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
		)
	) {
		return `Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`;
	}

	if (message.includes('Unable to create a unique project slug') || message.includes('already')) {
		return 'Choose a different project name';
	}

	if (message.includes('Too many new projects')) {
		return 'Too many new projects — please try again later.';
	}

	return 'Unable to create project';
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : '';
}
