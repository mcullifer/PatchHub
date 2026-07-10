import { form, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { requireInternalUser } from '$lib/server/auth/AuthContext';
import { convex, getConvexServerSecret } from '$lib/server/convex';
import { getProjectBannerValidationError } from '$lib/server/projects/projectBanner';
import { getOwnerProfileForEvent } from '$lib/server/projects/ownerProfile';
import { getProjectNotes } from './patchNotes.remote';
import { error, invalid, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

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
	banner: v.optional(v.file())
});

export const createProject = form(
	createProjectSchema,
	async ({ name, description, banner }, issue) => {
		const event = getRequestEvent();
		const dbUser = await requireInternalUser(event);
		if (!dbUser.username) {
			error(401, 'Account setup is required');
		}
		const selectedBanner = getSelectedBanner(banner);
		if (selectedBanner) {
			const validationError = await getProjectBannerValidationError(selectedBanner);
			if (validationError) {
				invalid(issue.banner(validationError));
			}
		}

		let project: { slug: string };
		let bannerStorageId: Id<'_storage'> | undefined;
		try {
			if (selectedBanner) {
				bannerStorageId = await uploadProjectBanner(dbUser.authProviderId, selectedBanner);
			}

			project = await convex.mutation(api.projects.create, {
				secret: getConvexServerSecret(),
				authProviderId: dbUser.authProviderId,
				name,
				description: description || undefined,
				bannerStorageId
			});
		} catch (mutationError) {
			if (bannerStorageId) {
				await discardProjectBannerUpload(dbUser.authProviderId, bannerStorageId);
			}

			if (shouldRethrowProjectCreateError(mutationError)) {
				throw mutationError;
			}

			const message = getProjectCreateErrorMessage(mutationError);
			if (message.startsWith('Banner')) {
				invalid(issue.banner(message));
			}
			if (message.startsWith('Project description')) {
				invalid(issue.description(message));
			}

			invalid(issue.name(message));
		}

		// Slugs preserve Unicode letters (createSlug), which are invalid raw in a Location header
		redirect(303, `/${dbUser.username}/${encodeURIComponent(project.slug)}`);
	}
);

const updateProjectBannerSchema = v.object({
	projectId: v.string(),
	banner: v.file()
});

export const updateProjectBanner = form(
	updateProjectBannerSchema,
	async ({ projectId, banner }, issue) => {
		const dbUser = await requireInternalUser(getRequestEvent());
		const validationError = await getProjectBannerValidationError(banner);
		if (validationError) {
			invalid(issue.banner(validationError));
		}

		const typedProjectId = projectId as Id<'projects'>;
		let storageId: Id<'_storage'> | undefined;
		try {
			storageId = await uploadProjectBanner(dbUser.authProviderId, banner, typedProjectId);
			await convex.mutation(api.projects.setBanner, {
				secret: getConvexServerSecret(),
				authProviderId: dbUser.authProviderId,
				projectId: typedProjectId,
				storageId
			});
		} catch (uploadError) {
			if (storageId) {
				await discardProjectBannerUpload(dbUser.authProviderId, storageId, typedProjectId);
			}

			if (getErrorMessage(uploadError).includes('Not authorized')) {
				error(403, 'Not authorized');
			}
			if (shouldRethrowProjectCreateError(uploadError)) {
				throw uploadError;
			}

			invalid(issue.banner('Unable to update the project banner'));
		}

		await requested(getProjectNotes, 1).refreshAll();
		return { updated: true };
	}
);

function getSelectedBanner(banner: File | undefined): File | undefined {
	return banner && (banner.name !== '' || banner.size > 0) ? banner : undefined;
}

async function uploadProjectBanner(
	authProviderId: string,
	banner: File,
	projectId?: Id<'projects'>
): Promise<Id<'_storage'>> {
	const uploadUrl = await convex.mutation(api.projects.generateBannerUploadUrl, {
		secret: getConvexServerSecret(),
		authProviderId,
		projectId
	});
	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: { 'Content-Type': banner.type },
		body: banner
	});
	if (!response.ok) {
		throw new Error('Banner upload failed');
	}

	const result: unknown = await response.json();
	if (!isStorageUploadResult(result)) {
		throw new Error('Banner upload returned an invalid response');
	}

	return result.storageId as Id<'_storage'>;
}

async function discardProjectBannerUpload(
	authProviderId: string,
	storageId: Id<'_storage'>,
	projectId?: Id<'projects'>
): Promise<void> {
	try {
		await convex.mutation(api.projects.discardBannerUpload, {
			secret: getConvexServerSecret(),
			authProviderId,
			storageId,
			projectId
		});
	} catch {
		// Cleanup is best-effort so the original upload or mutation error remains actionable.
	}
}

function isStorageUploadResult(value: unknown): value is { storageId: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'storageId' in value &&
		typeof value.storageId === 'string'
	);
}

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

	if (message.includes('Unable to create a unique project slug')) {
		return 'Choose a different project name';
	}

	if (message.includes('Banner upload')) {
		return 'Banner upload must be a supported image up to 5 MB';
	}

	if (message.includes('already')) {
		return 'Choose a different project name';
	}

	return 'Unable to create project';
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : '';
}
