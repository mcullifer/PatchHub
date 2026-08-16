export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_SIZE_LABEL = '5 MB';
export const IMAGE_UPLOAD_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
] as const;
export const IMAGE_UPLOAD_ACCEPT = IMAGE_UPLOAD_MIME_TYPES.join(',');
export const IMAGE_UPLOAD_FORMATS_LABEL = 'JPEG, PNG, WebP, GIF, or AVIF';

type StoredImageMetadata = { size: number; contentType?: string };
const supportedImageTypes = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

export function getImageUploadValidationError(image: Blob, label: string): string | null {
	if (image.size === 0) return 'Choose an image to upload';
	if (image.size > IMAGE_UPLOAD_MAX_BYTES) {
		return `${label} must be at most ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`;
	}
	if (!supportedImageTypes.has(image.type)) {
		return `Choose a ${IMAGE_UPLOAD_FORMATS_LABEL} image`;
	}

	return null;
}

export function isValidStoredImage(
	metadata: StoredImageMetadata | null,
	contentType: string
): boolean {
	return Boolean(
		metadata &&
		metadata.size > 0 &&
		metadata.size <= IMAGE_UPLOAD_MAX_BYTES &&
		supportedImageTypes.has(contentType) &&
		(metadata.contentType === undefined || metadata.contentType === contentType)
	);
}
