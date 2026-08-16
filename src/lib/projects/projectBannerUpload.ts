import { uploadImageToConvexStorage } from '$convex/lib/imageUpload';
import type { Id } from '$convex/_generated/dataModel';
import { getFavorites } from '$lib/remote/favorites.remote';
import { getProjectPosts } from '$lib/remote/projectPosts.remote';
import { completeProjectBannerUpload, failProjectBannerUpload } from '$lib/remote/projects.remote';

let retryFile: { projectId: Id<'projects'>; file: File } | null = null;

export type ProjectBannerUploadResult = 'ready' | 'failed' | 'stale' | 'unreported_failure';

export async function runProjectBannerUpload({
	projectQuery,
	projectId,
	file,
	attemptId,
	uploadUrl
}: {
	projectQuery: ReturnType<typeof getProjectPosts>;
	projectId: Id<'projects'>;
	file: File;
	attemptId: string;
	uploadUrl: string;
}): Promise<ProjectBannerUploadResult> {
	rememberProjectBannerFile(projectId, file);

	try {
		const storageId = await uploadImageToConvexStorage(fetch, uploadUrl, file);
		const result = await completeProjectBannerUpload({
			projectId,
			attemptId,
			storageId,
			contentType: file.type
		}).updates(projectQuery, getFavorites());
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
