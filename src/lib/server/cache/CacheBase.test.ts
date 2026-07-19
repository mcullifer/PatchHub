import { Time } from '$lib/util/time';
import { describe, expect, it, vi } from 'vitest';
import { CacheBase } from './CacheBase';
import type { CacheReadResult } from './ICache';

class FakeCache extends CacheBase {
	claimCalls = 0;
	setCalls = 0;
	claimWindowMs: number | null = null;
	setTtlMs: number | null = null;

	private result: CacheReadResult<unknown>;
	private readonly claimWon: boolean;

	constructor(result: CacheReadResult<unknown>, claimWon = false) {
		super();
		this.result = result;
		this.claimWon = claimWon;
	}

	async get<T>(): Promise<CacheReadResult<T>> {
		return this.result as CacheReadResult<T>;
	}

	async set<T>(_key: string, value: T, opts: { ttlMs: number }): Promise<void> {
		this.setCalls++;
		this.setTtlMs = opts.ttlMs;
		this.result = { status: 'fresh', value };
	}

	protected async claimRefetch(_key: string, claimWindowMs: number): Promise<boolean> {
		this.claimCalls++;
		this.claimWindowMs = claimWindowMs;
		return this.claimWon;
	}
}

describe('CacheBase.getOrCreate', () => {
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

	it('serves stale data when another caller owns the claim', async () => {
		const cache = new FakeCache({ status: 'stale', value: 'cached' });
		const create = vi.fn(async () => 'upstream');

		await expect(cache.getOrCreate('key', create, { ttlMs: Time.MINUTE })).resolves.toEqual({
			value: 'cached',
			servedStale: true
		});
		expect(create).not.toHaveBeenCalled();
	});

	it('returns null on a miss when another caller owns the claim', async () => {
		const cache = new FakeCache({ status: 'miss' });
		const create = vi.fn(async () => 'upstream');

		await expect(cache.getOrCreate('key', create, { ttlMs: Time.MINUTE })).resolves.toBeNull();
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
