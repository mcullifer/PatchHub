import { Time } from '$lib/util/time';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCache } from './MemoryCache';

describe('MemoryCache', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reuses a fresh value until its TTL expires', async () => {
		const cache = new MemoryCache();
		const create = vi.fn(async () => 'upstream');

		await expect(cache.getOrCreate('key', create, { ttlMs: Time.MINUTE * 5 })).resolves.toEqual({
			value: 'upstream',
			servedStale: false
		});
		await expect(cache.getOrCreate('key', create, { ttlMs: Time.MINUTE * 5 })).resolves.toEqual({
			value: 'upstream',
			servedStale: false
		});
		expect(create).toHaveBeenCalledOnce();
	});

	it('shares one upstream request between concurrent callers', async () => {
		const cache = new MemoryCache();
		let finishRefresh: (value: string) => void = () => {};
		const create = vi.fn(
			async () =>
				await new Promise<string>((resolve) => {
					finishRefresh = resolve;
				})
		);

		const requests = Array.from({ length: 10 }, () =>
			cache.getOrCreate('key', create, { ttlMs: Time.MINUTE * 5 })
		);
		await Promise.resolve();
		expect(create).toHaveBeenCalledOnce();

		finishRefresh('upstream');
		await expect(Promise.all(requests)).resolves.toEqual(
			Array.from({ length: 10 }, () => ({ value: 'upstream', servedStale: false }))
		);
	});

	it('serves an expired value when its shared refresh fails', async () => {
		const cache = new MemoryCache();
		await cache.set('key', 'cached', { ttlMs: Time.MINUTE * 5 });
		vi.advanceTimersByTime(Time.MINUTE * 5);
		const create = vi.fn(async () => {
			throw new Error('upstream failed');
		});

		await expect(
			Promise.all([
				cache.getOrCreate('key', create, { ttlMs: Time.MINUTE * 5 }),
				cache.getOrCreate('key', create, { ttlMs: Time.MINUTE * 5 })
			])
		).resolves.toEqual([
			{ value: 'cached', servedStale: true },
			{ value: 'cached', servedStale: true }
		]);
		expect(create).toHaveBeenCalledOnce();
	});
});
