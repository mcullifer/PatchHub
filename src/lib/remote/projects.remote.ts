import { command, form, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from '$convex/lib/contentLimits';
import { getProjectBannerValidationError } from '$lib/projects/projectBanner';
import { captureServerEvent } from '$lib/server/analytics';
import { requireAuth } from '$lib/server/auth/authContext';
import { createConvexClient } from '$lib/server/convex';
import { loadOwnerProfile } from '$lib/server/projects/ownerProfile';
import { invalid } from '@sveltejs/kit';
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
	bannerRequested: v.optional(v.literal('yes'))
});

const updateProjectSchema = v.object({
	projectId: v.string(),
	name: projectNameSchema,
	description: projectDescriptionSchema
});

const projectIdSchema = v.object({
	projectId: v.string()
});

const projectBannerAttemptSchema = v.object({
	projectId: v.string(),
	attemptId: v.string()
});

const completeProjectBannerUploadSchema = v.object({
	projectId: v.string(),
	attemptId: v.string(),
	storageId: v.string(),
	contentType: v.string()
});

export const getOwnerProfile = query(ownerSlugSchema, async (createdBy) => {
	return await loadOwnerProfile(getRequestEvent(), createdBy);
});

export const createProject = form(
	createProjectSchema,
	async ({ name, description, bannerRequested }, issue) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);

		try {
			const project = await convex.mutation(api.projects.create, {
				name,
				description: description || undefined,
				bannerUploadAttemptId: bannerRequested ? crypto.randomUUID() : undefined
			});
			await captureServerEvent(event, user.id, {
				name: 'project created',
				properties: { banner_requested: bannerRequested === 'yes' }
			});

			await requested(getOwnerProfile, 1).refreshAll();
			return project;
		} catch (mutationError) {
			if (shouldRethrowProjectCreateError(mutationError)) {
				throw mutationError;
			}

			const message = getProjectCreateErrorMessage(mutationError);
			if (message.startsWith('Project description')) {
				invalid(issue.description(message));
			}

			invalid(issue.name(message));
		}
	}
);

export const updateProject = command(
	updateProjectSchema,
	async ({ projectId, name, description }) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);
		const project = await convex.mutation(api.projects.update, {
			projectId: projectId as Id<'projects'>,
			name,
			description: description || undefined
		});
		await captureServerEvent(event, user.id, { name: 'project updated' });

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

export const beginProjectBannerUpload = command(projectIdSchema, async ({ projectId }) => {
	const event = getRequestEvent();
	requireAuth(event);
	const convex = createConvexClient(event);
	const result = await convex.mutation(api.projects.beginBannerUpload, {
		projectId: projectId as Id<'projects'>,
		attemptId: crypto.randomUUID()
	});
	await requested(getProjectPosts, 1).refreshAll();
	return result;
});

export const completeProjectBannerUpload = command(
	completeProjectBannerUploadSchema,
	async ({ projectId, attemptId, storageId, contentType }) => {
		const event = getRequestEvent();
		const user = requireAuth(event);
		const convex = createConvexClient(event);
		const typedProjectId = projectId as Id<'projects'>;
		const typedStorageId = storageId as Id<'_storage'>;
		const upload = {
			projectId: typedProjectId,
			attemptId
		};
		const claim = await convex.mutation(api.projects.claimBannerUpload, {
			...upload,
			storageId: typedStorageId,
			contentType
		});

		if (claim.status !== 'claimed') {
			await requested(getProjectPosts, 1).refreshAll();
			return { status: claim.status };
		}

		const claimedUpload = await convex.query(api.projects.getClaimedBannerUpload, {
			...upload,
			storageId: typedStorageId
		});
		let outcome: 'ready' | 'invalid_file' | 'upload_failed';
		try {
			const response = claimedUpload ? await fetch(claimedUpload.url) : null;
			if (!response?.ok || !claimedUpload) {
				outcome = 'upload_failed';
			} else {
				const blob = new Blob([await response.arrayBuffer()], {
					type: claimedUpload.contentType
				});
				outcome = (await getProjectBannerValidationError(blob)) ? 'invalid_file' : 'ready';
			}
		} catch {
			outcome = 'upload_failed';
		}

		const result = await convex.mutation(api.projects.finishBannerUpload, {
			...upload,
			storageId: typedStorageId,
			outcome
		});
		if (outcome === 'ready') {
			await captureServerEvent(event, user.id, {
				name: 'project banner uploaded'
			});
			await Promise.all([
				requested(getFavorites, 1).refreshAll(),
				requested(getProjectPosts, 1).refreshAll()
			]);
			return result;
		}

		await requested(getProjectPosts, 1).refreshAll();
		return result;
	}
);

export const failProjectBannerUpload = command(
	projectBannerAttemptSchema,
	async ({ projectId, attemptId }) => {
		const event = getRequestEvent();
		requireAuth(event);
		const convex = createConvexClient(event);
		const result = await convex.mutation(api.projects.failBannerUpload, {
			projectId: projectId as Id<'projects'>,
			attemptId
		});
		await requested(getProjectPosts, 1).refreshAll();
		return result;
	}
);

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
