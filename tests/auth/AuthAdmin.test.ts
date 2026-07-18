import { requirePatchHubAdmin } from '$lib/server/auth/admin';
import { requireInternalUser } from '$lib/server/auth/AuthContext';
import { error, type RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual<typeof import('@sveltejs/kit')>('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn((status: number, body: string) => {
			throw new Error(`${status}:${body}`);
		})
	};
});

vi.mock('$lib/server/auth/AuthContext', () => ({
	requireInternalUser: vi.fn()
}));

const mockedRequireInternalUser = vi.mocked(requireInternalUser);
const mockedError = vi.mocked(error);

describe('requirePatchHubAdmin', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows platform admins', async () => {
		const adminUser = { platformRole: 'admin' };
		mockedRequireInternalUser.mockResolvedValue(
			adminUser as Awaited<ReturnType<typeof requireInternalUser>>
		);

		await expect(requirePatchHubAdmin({} as RequestEvent)).resolves.toBe(adminUser);
		expect(mockedError).not.toHaveBeenCalled();
	});

	it('rejects users without the platform admin role', async () => {
		mockedRequireInternalUser.mockResolvedValue({
			platformRole: 'member'
		} as Awaited<ReturnType<typeof requireInternalUser>>);

		await expect(requirePatchHubAdmin({} as RequestEvent)).rejects.toThrow('403:Forbidden');
		expect(mockedError).toHaveBeenCalledWith(403, 'Forbidden');
	});
});
