import { createConvexClient } from '$lib/server/convex';
import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	createHttpClient: vi.fn(),
	setAuth: vi.fn()
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_CONVEX_URL: 'https://example.convex.cloud'
}));

vi.mock('convex/browser', () => ({
	ConvexHttpClient: class {
		constructor(...args: unknown[]) {
			mocks.createHttpClient(...args);
		}

		setAuth(accessToken: string) {
			mocks.setAuth(accessToken);
		}
	}
}));

describe('createConvexClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the request fetch and attaches its access token', () => {
		const event = createEvent('access-token');

		createConvexClient(event);

		expect(mocks.createHttpClient).toHaveBeenCalledWith('https://example.convex.cloud', {
			fetch: event.fetch
		});
		expect(mocks.setAuth).toHaveBeenCalledWith('access-token');
	});

	it('leaves the client anonymous when the request has no access token', () => {
		createConvexClient(createEvent());

		expect(mocks.setAuth).not.toHaveBeenCalled();
	});
});

function createEvent(accessToken?: string): RequestEvent {
	return {
		fetch: vi.fn(),
		locals: {
			auth: { user: null, accessToken }
		}
	} as unknown as RequestEvent;
}
