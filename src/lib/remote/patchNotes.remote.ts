import { command, getRequestEvent, query, requested } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { getAuthContext, requireInternalUser } from '$lib/server/auth/AuthContext';
import { convex, getConvexServerSecret } from '$lib/server/convex';
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

export const getProjectNotes = query(ownerProjectArgs, async ({ createdBy, projectSlug }) => {
	const result = await convex.query(api.patchNotes.listByOwnerAndProject, {
		createdBy,
		projectSlug,
		...(await viewerAuthArgs())
	});
	if (!result) error(404, 'Not found');
	return result;
});

export const getPatchNote = query(
	v.object({ createdBy: v.string(), projectSlug: v.string(), noteSlug: v.string() }),
	async ({ createdBy, projectSlug, noteSlug }) => {
		const result = await convex.query(api.patchNotes.getByOwnerProjectAndSlug, {
			createdBy,
			projectSlug,
			noteSlug,
			...(await viewerAuthArgs())
		});
		if (!result) error(404, 'Not found');
		return result;
	}
);

export const getOwnedProject = query(ownerProjectArgs, async ({ createdBy, projectSlug }) => {
	const result = await convex.query(api.patchNotes.listByOwnerAndProject, {
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

const PATCH_NOTE_TITLE_MAX_LENGTH = 150;
const PATCH_NOTE_CONTENT_MAX_LENGTH = 400_000;

const createPatchNoteSchema = v.object({
	projectId: v.string(),
	title: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Patch note title is required'),
		v.maxLength(
			PATCH_NOTE_TITLE_MAX_LENGTH,
			`Patch note title must be at most ${PATCH_NOTE_TITLE_MAX_LENGTH} characters`
		)
	),
	content: v.pipe(
		v.string(),
		v.maxLength(
			PATCH_NOTE_CONTENT_MAX_LENGTH,
			`Patch note content must be at most ${PATCH_NOTE_CONTENT_MAX_LENGTH} characters`
		)
	),
	status: v.picklist(['draft', 'published'])
});

export const createPatchNote = command(createPatchNoteSchema, async (input) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	const patchNote = await convex.mutation(api.patchNotes.create, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		projectId: input.projectId as Id<'projects'>,
		title: input.title,
		content: input.content,
		status: input.status
	});

	await requested(getProjectNotes, 1).refreshAll();

	return { slug: patchNote.slug };
});
