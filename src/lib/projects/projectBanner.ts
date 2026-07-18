export const PROJECT_BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const PROJECT_BANNER_MAX_SIZE_LABEL = '5 MB';
export const PROJECT_BANNER_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
] as const;
export const PROJECT_BANNER_ACCEPT = PROJECT_BANNER_MIME_TYPES.join(',');

type ProjectBannerMimeType = (typeof PROJECT_BANNER_MIME_TYPES)[number];

const SIGNATURE_READ_BYTES = 64;

export async function getProjectBannerValidationError(file: Blob): Promise<string | null> {
	if (file.size === 0) {
		return 'Choose an image to upload';
	}

	if (file.size > PROJECT_BANNER_MAX_BYTES) {
		return `Banner images must be at most ${PROJECT_BANNER_MAX_SIZE_LABEL}`;
	}

	if (!isProjectBannerMimeType(file.type)) {
		return 'Choose a JPEG, PNG, WebP, GIF, or AVIF image';
	}

	const bytes = new Uint8Array(await file.slice(0, SIGNATURE_READ_BYTES).arrayBuffer());
	if (!hasImageSignature(bytes, file.type)) {
		return 'The selected file is not a valid image';
	}

	return null;
}

function isProjectBannerMimeType(value: string): value is ProjectBannerMimeType {
	return PROJECT_BANNER_MIME_TYPES.some((mimeType) => mimeType === value);
}

function hasImageSignature(bytes: Uint8Array, mimeType: ProjectBannerMimeType): boolean {
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
		if (matchesAscii(bytes, offset, 'avif') || matchesAscii(bytes, offset, 'avis')) {
			return true;
		}
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
