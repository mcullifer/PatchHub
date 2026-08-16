import type { Id } from '../_generated/dataModel';

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

type ImageUploadMimeType = (typeof IMAGE_UPLOAD_MIME_TYPES)[number];
type StoredImageMetadata = { size: number; contentType?: string };

const SIGNATURE_READ_BYTES = 64;

export async function getImageUploadValidationError(
	image: Blob,
	label: string
): Promise<string | null> {
	if (image.size === 0) return 'Choose an image to upload';
	if (image.size > IMAGE_UPLOAD_MAX_BYTES) {
		return `${label} must be at most ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`;
	}
	if (!isImageUploadMimeType(image.type)) {
		return 'Choose a JPEG, PNG, WebP, GIF, or AVIF image';
	}

	const bytes = new Uint8Array(await image.slice(0, SIGNATURE_READ_BYTES).arrayBuffer());
	return hasImageSignature(bytes, image.type) ? null : 'The selected file is not a valid image';
}

export function isValidStoredImage(
	metadata: StoredImageMetadata | null,
	contentType?: string
): boolean {
	if (!metadata || metadata.size === 0 || metadata.size > IMAGE_UPLOAD_MAX_BYTES) return false;
	if (contentType === undefined) return true;

	return (
		isImageUploadMimeType(contentType) &&
		(metadata.contentType === undefined || metadata.contentType === contentType)
	);
}

export async function uploadImageToConvexStorage(
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

function isImageUploadMimeType(value: string): value is ImageUploadMimeType {
	return IMAGE_UPLOAD_MIME_TYPES.some((mimeType) => mimeType === value);
}

function isStorageUploadResult(value: unknown): value is { storageId: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'storageId' in value &&
		typeof value.storageId === 'string'
	);
}

function hasImageSignature(bytes: Uint8Array, mimeType: ImageUploadMimeType): boolean {
	switch (mimeType) {
		case 'image/jpeg':
			return matchesBytes(bytes, 0, [0xff, 0xd8, 0xff]);
		case 'image/png':
			return matchesBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		case 'image/webp':
			return matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP');
		case 'image/gif':
			return matchesAscii(bytes, 0, 'GIF87a') || matchesAscii(bytes, 0, 'GIF89a');
		case 'image/avif':
			return matchesAscii(bytes, 4, 'ftyp') && containsAvifBrand(bytes);
	}
}

function containsAvifBrand(bytes: Uint8Array): boolean {
	for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
		if (matchesAscii(bytes, offset, 'avif') || matchesAscii(bytes, offset, 'avis')) return true;
	}

	return false;
}

function matchesAscii(bytes: Uint8Array, offset: number, expected: string): boolean {
	return matchesBytes(
		bytes,
		offset,
		Array.from(expected, (character) => character.charCodeAt(0))
	);
}

function matchesBytes(bytes: Uint8Array, offset: number, expected: number[]): boolean {
	return expected.every((value, index) => bytes[offset + index] === value);
}
