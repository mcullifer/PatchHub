import { UPSTREAM_FETCH_OPTIONS } from '$lib/server/http/boundedFetch';
import {
	getAppListPage,
	getPopularSteamGames,
	type SteamApiError
} from '$lib/server/steam/SteamApiClient';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('SteamApiClient', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('normalizes final app-list pages when Steam omits pagination fields', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [
							{ appid: 4783350, name: 'Retro Futbol' },
							{ appid: 4783400, name: 'CIRCLO' }
						]
					}
				})
			);

		const page = await getAppListPage({
			apiKey: 'test-key',
			apiBaseUrl: 'https://steam.test',
			lastAppId: 4783340,
			fetchFn
		});

		expect(page.response).toEqual({
			apps: [
				{ appid: 4783350, name: 'Retro Futbol' },
				{ appid: 4783400, name: 'CIRCLO' }
			],
			have_more_results: false,
			last_appid: 4783400
		});
	});

	it('normalizes empty app-list responses as complete at the requested cursor', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {}
				})
			);

		const page = await getAppListPage({
			apiKey: 'test-key',
			apiBaseUrl: 'https://steam.test',
			lastAppId: 4843820,
			fetchFn
		});

		expect(page.response).toEqual({
			apps: [],
			have_more_results: false,
			last_appid: 4843820
		});
	});

	it('throws a typed error for non-OK app-list responses', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 });

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'http_error',
			status: 503
		} satisfies Partial<SteamApiError>);
	});

	it('throws a typed error for invalid app-list response shapes', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(
				JSON.stringify({
					response: {
						apps: [{ appid: 'not-a-number', name: 'Broken App' }],
						have_more_results: false,
						last_appid: 123
					}
				})
			);

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'invalid_response'
		} satisfies Partial<SteamApiError>);
	});

	it('throws a typed error for app-list network failures', async () => {
		const networkError = new Error('socket closed');
		const fetchFn: typeof fetch = async () => {
			throw networkError;
		};

		await expect(
			getAppListPage({
				apiKey: 'test-key',
				apiBaseUrl: 'https://steam.test',
				fetchFn
			})
		).rejects.toMatchObject({
			code: 'network_error',
			cause: networkError
		} satisfies Partial<SteamApiError>);
	});

	it('bounds Steam API request duration', async () => {
		vi.useFakeTimers();
		const fetchFn: typeof fetch = async (_input, init) => {
			return await new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal;
				if (!signal) throw new Error('Expected an abort signal');
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
		};

		const request = getPopularSteamGames({ apiBaseUrl: 'https://steam.test', fetchFn });
		const rejection = expect(request).rejects.toMatchObject({
			code: 'network_error',
			cause: expect.objectContaining({
				message: `Request timed out after ${UPSTREAM_FETCH_OPTIONS.timeoutMs}ms`
			})
		});

		await vi.advanceTimersByTimeAsync(UPSTREAM_FETCH_OPTIONS.timeoutMs);
		await rejection;
	});
});
