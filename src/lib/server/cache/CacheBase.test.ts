import { Time } from '$lib/util/time';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CacheBase } from './CacheBase';
import type { CacheReadResult } from './ICache';

class FakeCache extends CacheBase {
	claimCalls = 0;
	setCalls = 0;
	claimWindowMs: number | null = null;
	setTtlMs: number | null = null;

	private result: CacheReadResult<unknown>;
	private readonly claimWon: boolean | Promise<boolean>;

	constructor(result: CacheReadResult<unknown>, claimWon: boolean | Promise<boolean> = false) {
		super();
		this.result = result;
		this.claimWon = claimWon;
	}

	protected async claimRefetch(_key: string, claimWindowMs: number): Promise<boolean> {
		this.claimCalls++;
		this.claimWindowMs = claimWindowMs;
		return await this.claimWon;
	}

	async get<T>(): Promise<CacheReadResult<T>> {
		return this.result as CacheReadResult<T>;
	}

	async set<T>(_key: string, value: T, opts: { ttlMs: number }): Promise<void> {
		this.setCalls++;
		this.setTtlMs = opts.ttlMs;
		this.result = { status: 'fresh', value };
	}

	replaceResult(result: CacheReadResult<unknown>) {
		this.result = result;
	}
}

class CoordinatedFakeCache extends CacheBase {
	claimCalls = 0;

	private claimed = false;
	private result: CacheReadResult<unknown> = { status: 'stale', value: 'cached' };

	protected async claimRefetch(): Promise<boolean> {
		this.claimCalls++;
		if (this.claimed) return false;

		this.claimed = true;
		return true;
	}

	async get<T>(): Promise<CacheReadResult<T>> {
		return this.result as CacheReadResult<T>;
	}

	async set<T>(_key: string, value: T): Promise<void> {
		this.result = { status: 'fresh', value };
	}
}

describe('CacheBase.getOrCreate', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns a fresh hit without claiming or creating', async () => {
		const cache = new FakeCache({ status: 'fresh', value: 'cached' });
		const create = vi.fn(async () => 'upstream');

		await expect(cache.getOrCreate('key', create, { ttlMs: Time.MINUTE })).resolves.toEqual({
			value: 'cached',
			servedStale: false
		});
		expect(cache.claimCalls).toBe(0);
		expect(create).not.toHaveBeenCalled();
	});

	it('replaces stale data when the claim winner creates successfully', async () => {
		const cache = new FakeCache({ status: 'stale', value: 'cached' }, true);

		await expect(
			cache.getOrCreate('key', async () => 'upstream', { ttlMs: Time.MINUTE })
		).resolves.toEqual({
			value: 'upstream',
			servedStale: false
		});
		expect(cache.claimWindowMs).toBe(Time.SECOND * 30);
		expect(cache.setCalls).toBe(1);
		expect(cache.setTtlMs).toBe(Time.MINUTE);
	});

	it('waits for the refetch claim before creating', async () => {
		let finishClaim: (claimed: boolean) => void = () => {};
		const claim = new Promise<boolean>((resolve) => {
			finishClaim = resolve;
		});
		const cache = new FakeCache({ status: 'stale', value: 'cached' }, claim);
		const create = vi.fn(async () => 'upstream');
		const result = cache.getOrCreate('key', create, { ttlMs: Time.MINUTE });

		await Promise.resolve();
		expect(create).not.toHaveBeenCalled();

		finishClaim(true);
		await expect(result).resolves.toEqual({ value: 'upstream', servedStale: false });
		expect(create).toHaveBeenCalledOnce();
		expect(cache.setCalls).toBe(1);
	});

	it('waits for the claim winner to refresh a stale value', async () => {
		vi.useFakeTimers();
		const cache = new FakeCache({ status: 'stale', value: 'cached' });
		const create = vi.fn(async () => 'unused');
		const result = cache.getOrCreate('key', create, { ttlMs: Time.MINUTE });

		await vi.advanceTimersByTimeAsync(0);
		cache.replaceResult({ status: 'fresh', value: 'upstream' });
		await vi.advanceTimersByTimeAsync(100);

		await expect(result).resolves.toEqual({ value: 'upstream', servedStale: false });
		expect(create).not.toHaveBeenCalled();
	});

	it('shares one refresh result between concurrent callers', async () => {
		vi.useFakeTimers();
		const cache = new CoordinatedFakeCache();
		let finishRefresh: (value: string) => void = () => {};
		const create = vi.fn(
			async () =>
				await new Promise<string>((resolve) => {
					finishRefresh = resolve;
				})
		);
		const requests = Array.from({ length: 10 }, () =>
			cache.getOrCreate('key', create, { ttlMs: Time.MINUTE })
		);

		await vi.advanceTimersByTimeAsync(0);
		expect(create).toHaveBeenCalledOnce();
		finishRefresh('upstream');
		await vi.advanceTimersByTimeAsync(100);

		await expect(Promise.all(requests)).resolves.toEqual(
			Array.from({ length: 10 }, () => ({ value: 'upstream', servedStale: false }))
		);
		expect(cache.claimCalls).toBe(10);
	});

	it('returns the refreshed value to the claim winner', async () => {
		const cache = new FakeCache({ status: 'stale', value: 'cached' }, true);
		let finishRefresh: (value: string) => void = () => {};
		const create = vi.fn(
			async () =>
				await new Promise<string>((resolve) => {
					finishRefresh = resolve;
				})
		);

		const result = cache.getOrCreate('key', create, { ttlMs: Time.MINUTE });
		await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
		finishRefresh('upstream');

		await expect(result).resolves.toEqual({ value: 'upstream', servedStale: false });
		expect(cache.setCalls).toBe(1);
	});

	it('serves stale data when the claim winner create fails', async () => {
		const cache = new FakeCache({ status: 'stale', value: 'cached' }, true);

		await expect(
			cache.getOrCreate(
				'key',
				async () => {
					throw new Error('upstream failed');
				},
				{ ttlMs: Time.MINUTE }
			)
		).resolves.toEqual({ value: 'cached', servedStale: true });
		expect(cache.setCalls).toBe(0);
	});

	it('serves stale data when the claim winner does not finish within the claim window', async () => {
		vi.useFakeTimers();
		const cache = new FakeCache({ status: 'stale', value: 'cached' });
		const create = vi.fn(async () => 'upstream');
		const result = cache.getOrCreate('key', create, { ttlMs: Time.MINUTE });

		await vi.advanceTimersByTimeAsync(Time.SECOND * 30);
		await expect(result).resolves.toEqual({
			value: 'cached',
			servedStale: true
		});
		expect(create).not.toHaveBeenCalled();
	});

	it('returns null when a missing value is not populated within the claim window', async () => {
		vi.useFakeTimers();
		const cache = new FakeCache({ status: 'miss' });
		const create = vi.fn(async () => 'upstream');
		const result = cache.getOrCreate('key', create, { ttlMs: Time.MINUTE });

		await vi.advanceTimersByTimeAsync(Time.SECOND * 30);
		await expect(result).resolves.toBeNull();
		expect(create).not.toHaveBeenCalled();
	});

	it('creates and caches a value on a claimed miss', async () => {
		const cache = new FakeCache({ status: 'miss' }, true);

		await expect(
			cache.getOrCreate('key', async () => 'upstream', { ttlMs: Time.MINUTE })
		).resolves.toEqual({
			value: 'upstream',
			servedStale: false
		});
		expect(cache.setCalls).toBe(1);
	});

	it('rethrows create failures on a claimed miss', async () => {
		const cache = new FakeCache({ status: 'miss' }, true);

		await expect(
			cache.getOrCreate(
				'key',
				async () => {
					throw new Error('upstream failed');
				},
				{ ttlMs: Time.MINUTE }
			)
		).rejects.toThrow('upstream failed');
		expect(cache.setCalls).toBe(0);
	});
});
