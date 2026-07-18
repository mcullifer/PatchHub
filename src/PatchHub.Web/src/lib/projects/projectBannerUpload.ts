import type { Id } from '$convex/_generated/dataModel';
import { getProjectNotes } from '$lib/remote/patchNotes.remote';
import { completeProjectBannerUpload, failProjectBannerUpload } from '$lib/remote/projects.remote';

let retryFile: { projectId: Id<'projects'>; file: File } | null = null;

export type ProjectBannerUploadResult = 'ready' | 'failed' | 'stale' | 'unreported_failure';

export async function uploadProjectBanner(uploadUrl: string, file: File): Promise<Id<'_storage'>> {
	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: { 'Content-Type': file.type },
		body: file
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

export async function runProjectBannerUpload({
	projectQuery,
	projectId,
	file,
	attemptId,
	uploadUrl
}: {
	projectQuery: ReturnType<typeof getProjectNotes>;
	projectId: Id<'projects'>;
	file: File;
	attemptId: string;
	uploadUrl: string;
}): Promise<ProjectBannerUploadResult> {
	rememberProjectBannerFile(projectId, file);

	try {
		const storageId = await uploadProjectBanner(uploadUrl, file);
		const result = await completeProjectBannerUpload({
			projectId,
			attemptId,
			storageId,
			contentType: file.type
		}).updates(projectQuery);
		if (result.status === 'ready') {
			forgetProjectBannerFile(projectId);
		}
		return result.status;
	} catch {
		try {
			const result = await failProjectBannerUpload({ projectId, attemptId }).updates(projectQuery);
			return result.status;
		} catch {
			return 'unreported_failure';
		}
	}
}

export function rememberProjectBannerFile(projectId: Id<'projects'>, file: File): void {
	retryFile = { projectId, file };
}

export function getRememberedProjectBannerFile(projectId: Id<'projects'>): File | null {
	return retryFile?.projectId === projectId ? retryFile.file : null;
}

export function forgetProjectBannerFile(projectId: Id<'projects'>): void {
	if (retryFile?.projectId === projectId) {
		retryFile = null;
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
