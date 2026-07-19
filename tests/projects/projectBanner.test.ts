import {
	PROJECT_BANNER_MAX_BYTES,
	getProjectBannerValidationError
} from '$lib/projects/projectBanner';
import { describe, expect, it } from 'vitest';

describe('getProjectBannerValidationError', () => {
	it.each([
		['JPEG', 'image/jpeg', [0xff, 0xd8, 0xff, 0xdb]],
		['PNG', 'image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
		['WebP', 'image/webp', asciiBytes('RIFF\0\0\0\0WEBP')],
		['GIF', 'image/gif', asciiBytes('GIF89a')],
		['AVIF', 'image/avif', [0, 0, 0, 24, ...asciiBytes('ftypavif')]]
	])('accepts a valid %s signature', async (_, mimeType, bytes) => {
		const file = new File([new Uint8Array(bytes)], 'banner', { type: mimeType });

		await expect(getProjectBannerValidationError(file)).resolves.toBeNull();
	});

	it('rejects a non-image whose MIME type claims it is an image', async () => {
		const file = new File(['not an image'], 'banner.png', { type: 'image/png' });

		await expect(getProjectBannerValidationError(file)).resolves.toBe(
			'The selected file is not a valid image'
		);
	});

	it('rejects images larger than the project banner limit', async () => {
		const file = new File([new Uint8Array(PROJECT_BANNER_MAX_BYTES + 1)], 'banner.jpg', {
			type: 'image/jpeg'
		});

		await expect(getProjectBannerValidationError(file)).resolves.toBe(
			'Banner images must be at most 5 MB'
		);
	});
});

function asciiBytes(value: string): number[] {
	return Array.from(value, (character) => character.charCodeAt(0));
}
