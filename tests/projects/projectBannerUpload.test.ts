import { uploadProjectBanner } from '$lib/projects/projectBannerUpload';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('uploadProjectBanner', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns the storage id from a successful upload', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ storageId: 'storage-1' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		const file = new File(['image'], 'banner.jpg', { type: 'image/jpeg' });
		await expect(uploadProjectBanner('https://example.com/upload', file)).resolves.toBe(
			'storage-1'
		);
	});

	it('rejects a failed upload response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

		const file = new File(['image'], 'banner.jpg', { type: 'image/jpeg' });
		await expect(uploadProjectBanner('https://example.com/upload', file)).rejects.toThrow(
			'Banner upload failed'
		);
	});

	it('rejects a malformed successful response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ nope: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		const file = new File(['image'], 'banner.jpg', { type: 'image/jpeg' });
		await expect(uploadProjectBanner('https://example.com/upload', file)).rejects.toThrow(
			'Banner upload returned an invalid response'
		);
	});
});
