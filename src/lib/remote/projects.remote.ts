import { command, form, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { getProjectBannerValidationError } from '$lib/projects/projectBanner';
import { requireInternalUser } from '$lib/server/auth/AuthContext';
import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { getOwnerProfileForEvent } from '$lib/server/projects/ownerProfile';
import { error, invalid } from '@sveltejs/kit';
import * as v from 'valibot';
import { getProjectNotes } from './patchNotes.remote';

export const getOwnerProfile = query(v.string(), async (createdBy) => {
	return await getOwnerProfileForEvent(getRequestEvent(), createdBy);
});

const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_DESCRIPTION_MAX_LENGTH = 500;

const createProjectSchema = v.object({
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Project name is required'),
		v.maxLength(
			PROJECT_NAME_MAX_LENGTH,
			`Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`
		)
	),
	description: v.optional(
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(
				PROJECT_DESCRIPTION_MAX_LENGTH,
				`Project description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
			)
		)
	),
	bannerRequested: v.optional(v.literal('yes'))
});

export const createProject = form(
	createProjectSchema,
	async ({ name, description, bannerRequested }, issue) => {
		const dbUser = await requireInternalUser(getRequestEvent());
		if (!dbUser.username) {
			error(401, 'Account setup is required');
		}

		try {
			const project = await createConvexClient().mutation(api.projects.create, {
				secret: getConvexServerSecret(),
				authProviderId: dbUser.authProviderId,
				name,
				description: description || undefined,
				bannerUploadAttemptId: bannerRequested ? crypto.randomUUID() : undefined
			});

			await requested(getOwnerProfile, 1).refreshAll();
			return {
				project: {
					id: project.id,
					createdBy: dbUser.username,
					slug: project.slug
				},
				bannerUpload: project.bannerUpload
			};
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

const projectBannerSchema = v.object({
	projectId: v.string()
});

const projectBannerAttemptSchema = v.object({
	projectId: v.string(),
	attemptId: v.string()
});

export const beginProjectBannerUpload = command(projectBannerSchema, async ({ projectId }) => {
	const dbUser = await requireInternalUser(getRequestEvent());
	const result = await createConvexClient().mutation(api.projects.beginBannerUpload, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		projectId: projectId as Id<'projects'>,
		attemptId: crypto.randomUUID()
	});
	await requested(getProjectNotes, 1).refreshAll();
	return result;
});

export const completeProjectBannerUpload = command(
	v.object({
		projectId: v.string(),
		attemptId: v.string(),
		storageId: v.string(),
		contentType: v.string()
	}),
	async ({ projectId, attemptId, storageId, contentType }) => {
		const dbUser = await requireInternalUser(getRequestEvent());
		const convex = createConvexClient();
		const typedProjectId = projectId as Id<'projects'>;
		const typedStorageId = storageId as Id<'_storage'>;
		const auth = {
			secret: getConvexServerSecret(),
			authProviderId: dbUser.authProviderId,
			projectId: typedProjectId,
			attemptId
		};
		const claim = await convex.mutation(api.projects.claimBannerUpload, {
			...auth,
			storageId: typedStorageId,
			contentType
		});

		if (claim.status !== 'claimed') {
			await requested(getProjectNotes, 1).refreshAll();
			return { status: claim.status };
		}

		const claimedUpload = await convex.query(api.projects.getClaimedBannerUpload, {
			...auth,
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
			...auth,
			storageId: typedStorageId,
			outcome
		});
		await requested(getProjectNotes, 1).refreshAll();
		return result;
	}
);

export const failProjectBannerUpload = command(
	projectBannerAttemptSchema,
	async ({ projectId, attemptId }) => {
		const dbUser = await requireInternalUser(getRequestEvent());
		const result = await createConvexClient().mutation(api.projects.failBannerUpload, {
			secret: getConvexServerSecret(),
			authProviderId: dbUser.authProviderId,
			projectId: projectId as Id<'projects'>,
			attemptId
		});
		await requested(getProjectNotes, 1).refreshAll();
		return result;
	}
);

function shouldRethrowProjectCreateError(error: unknown): boolean {
	const message = getErrorMessage(error);
	return (
		message.includes('Unauthorized') ||
		message.includes('SERVER_SECRET') ||
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

	return 'Unable to create project';
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : '';
}
