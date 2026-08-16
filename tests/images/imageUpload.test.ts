import {
	IMAGE_UPLOAD_MAX_BYTES,
	getImageUploadValidationError,
	isValidStoredImage,
	uploadImageToConvexStorage
} from '$convex/lib/imageUpload';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getImageUploadValidationError', () => {
	it.each([
		['JPEG', 'image/jpeg', [0xff, 0xd8, 0xff, 0xdb]],
		['PNG', 'image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
		['WebP', 'image/webp', asciiBytes('RIFF\0\0\0\0WEBP')],
		['GIF', 'image/gif', asciiBytes('GIF89a')],
		['AVIF', 'image/avif', [0, 0, 0, 24, ...asciiBytes('ftypavif')]]
	])('accepts a valid %s signature', async (_, mimeType, bytes) => {
		const file = new File([new Uint8Array(bytes)], 'image', { type: mimeType });

		await expect(getImageUploadValidationError(file, 'Image')).resolves.toBeNull();
	});

	it('rejects a non-image whose MIME type claims it is an image', async () => {
		const file = new File(['not an image'], 'image.png', { type: 'image/png' });

		await expect(getImageUploadValidationError(file, 'Image')).resolves.toBe(
			'The selected file is not a valid image'
		);
	});

	it('rejects images over the shared size limit', async () => {
		const file = new File([new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1)], 'image.jpg', {
			type: 'image/jpeg'
		});

		await expect(getImageUploadValidationError(file, 'Image')).resolves.toBe(
			'Image must be at most 5 MB'
		);
	});
});

describe('isValidStoredImage', () => {
	it('applies the same size and MIME rules to Convex storage metadata', () => {
		expect(isValidStoredImage({ size: 1024, contentType: 'image/png' }, 'image/png')).toBe(true);
		expect(isValidStoredImage({ size: 1024, contentType: 'text/plain' }, 'text/plain')).toBe(false);
	});
});

describe('uploadImageToConvexStorage', () => {
	it('returns the storage ID from a successful upload', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ storageId: 'storage-1' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		const image = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
		await expect(
			uploadImageToConvexStorage(fetch, 'https://example.com/upload', image)
		).resolves.toBe('storage-1');
	});

	it('rejects failed and malformed upload responses', async () => {
		const image = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
		await expect(
			uploadImageToConvexStorage(fetch, 'https://example.com/upload', image)
		).rejects.toThrow('Image upload failed');

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ nope: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);
		await expect(
			uploadImageToConvexStorage(fetch, 'https://example.com/upload', image)
		).rejects.toThrow('Image upload returned an invalid response');
	});
});

function asciiBytes(value: string): number[] {
	return Array.from(value, (character) => character.charCodeAt(0));
}
