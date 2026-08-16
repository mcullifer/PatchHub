import {
	IMAGE_UPLOAD_MAX_BYTES,
	getImageUploadValidationError,
	isValidStoredImage
} from '$lib/images/imageValidation';
import { uploadImageToStorage } from '$lib/images/imageUpload';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getImageUploadValidationError', () => {
	it.each([
		['JPEG', 'image/jpeg'],
		['PNG', 'image/png'],
		['WebP', 'image/webp'],
		['GIF', 'image/gif'],
		['AVIF', 'image/avif']
	])('accepts the %s file type', (_, mimeType) => {
		const file = new File(['image'], 'image', { type: mimeType });

		expect(getImageUploadValidationError(file, 'Image')).toBeNull();
	});

	it('rejects unsupported file types', () => {
		const file = new File(['image'], 'image.svg', { type: 'image/svg+xml' });

		expect(getImageUploadValidationError(file, 'Image')).toBe(
			'Choose a JPEG, PNG, WebP, GIF, or AVIF image'
		);
	});

	it('rejects images over the shared size limit', () => {
		const file = new File([new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1)], 'image.jpg', {
			type: 'image/jpeg'
		});

		expect(getImageUploadValidationError(file, 'Image')).toBe('Image must be at most 5 MB');
	});
});

describe('isValidStoredImage', () => {
	it('applies the same size and MIME rules to Convex storage metadata', () => {
		expect(isValidStoredImage({ size: 1024, contentType: 'image/png' }, 'image/png')).toBe(true);
		expect(isValidStoredImage({ size: 1024 }, 'image/png')).toBe(true);
		expect(isValidStoredImage({ size: 1024, contentType: 'text/plain' }, 'text/plain')).toBe(false);
	});
});

describe('uploadImageToStorage', () => {
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
		await expect(uploadImageToStorage(fetch, 'https://example.com/upload', image)).resolves.toBe(
			'storage-1'
		);
	});

	it('rejects failed and malformed upload responses', async () => {
		const image = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
		await expect(uploadImageToStorage(fetch, 'https://example.com/upload', image)).rejects.toThrow(
			'Image upload failed'
		);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ nope: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);
		await expect(uploadImageToStorage(fetch, 'https://example.com/upload', image)).rejects.toThrow(
			'Image upload returned an invalid response'
		);
	});
});
