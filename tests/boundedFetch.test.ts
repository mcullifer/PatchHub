import { boundedFetch } from '$lib/server/http/boundedFetch';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('boundedFetch', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('aborts requests after the timeout', async () => {
		vi.useFakeTimers();
		const fetchFn: typeof fetch = async (_input, init) => {
			return await new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal;
				if (!signal) throw new Error('Expected an abort signal');
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
		};

		const request = boundedFetch(fetchFn, 'https://example.com/feed', {
			timeoutMs: 100,
			maxBytes: 100
		});
		const rejection = expect(request).rejects.toThrow('Request timed out after 100ms');
		await vi.advanceTimersByTimeAsync(100);
		await rejection;
	});

	it('rejects an oversized declared content length', async () => {
		const fetchFn: typeof fetch = async () =>
			new Response('small body', { headers: { 'content-length': '101' } });

		await expect(
			boundedFetch(fetchFn, 'https://example.com/feed', {
				timeoutMs: 100,
				maxBytes: 100
			})
		).rejects.toThrow('Response exceeds 100 byte limit');
	});

	it('rejects an oversized streamed body without a content length', async () => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(60));
				controller.enqueue(new Uint8Array(41));
				controller.close();
			}
		});
		const fetchFn: typeof fetch = async () => new Response(body);

		await expect(
			boundedFetch(fetchFn, 'https://example.com/feed', {
				timeoutMs: 100,
				maxBytes: 100
			})
		).rejects.toThrow('Response exceeds 100 byte limit');
	});

	it('sets the configured user agent and returns the bounded response', async () => {
		const fetchFn: typeof fetch = async (_input, init) => {
			expect(new Headers(init?.headers).get('user-agent')).toBe('PatchHub/test');
			return new Response('feed body', { status: 200, statusText: 'OK' });
		};

		const response = await boundedFetch(fetchFn, 'https://example.com/feed', {
			timeoutMs: 100,
			maxBytes: 100,
			userAgent: 'PatchHub/test'
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('feed body');
	});
});
