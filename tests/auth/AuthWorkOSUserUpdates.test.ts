import { buildWorkOSExternalIdUpdate } from '$lib/server/auth/workos';
import { describe, expect, it } from 'vitest';

describe('buildWorkOSExternalIdUpdate', () => {
	it('updates only WorkOS externalId for PatchHub correlation', () => {
		expect(
			buildWorkOSExternalIdUpdate({
				userId: 'user_123',
				externalId: '42'
			})
		).toEqual({
			userId: 'user_123',
			externalId: '42'
		});
	});
});
