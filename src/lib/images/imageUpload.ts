import type { Id } from '$convex/_generated/dataModel';

export async function uploadImageToStorage(
	fetchFn: typeof fetch,
	uploadUrl: string,
	image: Blob
): Promise<Id<'_storage'>> {
	const response = await fetchFn(uploadUrl, {
		method: 'POST',
		headers: { 'Content-Type': image.type },
		body: image
	});
	if (!response.ok) throw new Error('Image upload failed');

	const result: unknown = await response.json();
	if (!isStorageUploadResult(result)) {
		throw new Error('Image upload returned an invalid response');
	}

	return result.storageId as Id<'_storage'>;
}

function isStorageUploadResult(value: unknown): value is { storageId: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'storageId' in value &&
		typeof value.storageId === 'string'
	);
}
