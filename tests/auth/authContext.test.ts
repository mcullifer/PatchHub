import { getAuthContext, requireAuth } from '$lib/server/auth/authContext';
import { createAuthenticatedConvexClient } from '$lib/server/convex';
import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('$lib/server/convex', () => ({
	createAuthenticatedConvexClient: vi.fn(() => ({ query }))
}));

const mockedCreateAuthenticatedConvexClient = vi.mocked(createAuthenticatedConvexClient);

describe('authContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('checks the existing WorkOS session without calling Convex', () => {
		const event = createEvent({ id: 'workos_1' });

		expect(requireAuth(event)).toMatchObject({ id: 'workos_1' });
		expect(mockedCreateAuthenticatedConvexClient).not.toHaveBeenCalled();
	});

	it('caches the PatchHub user lookup for the request', async () => {
		const user = {
			_id: 'user_1',
			authProviderId: 'workos_1',
			username: 'owner123',
			platformRole: 'member'
		};
		query.mockResolvedValue(user);
		const event = createEvent({ id: 'workos_1' });

		const [first, second] = await Promise.all([getAuthContext(event), getAuthContext(event)]);

		expect(first).toBe(second);
		expect(first).toMatchObject({
			workosUser: { id: 'workos_1' },
			user,
			status: 'active'
		});
		expect(query).toHaveBeenCalledOnce();
	});
});

function createEvent(user: { id: string } | null): RequestEvent {
	return {
		locals: {
			auth: { user }
		}
	} as unknown as RequestEvent;
}
