import { Time } from '$lib/util/time';
import type { CacheReadResult, ICache } from './ICache';

const refetchClaimWindowMs = Time.SECOND * 30;

type CacheOptions = {
	ttlMs: number;
};

export abstract class CacheBase implements ICache {
	protected abstract claimRefetch(key: string, claimWindowMs: number): Promise<boolean>;
	protected abstract deferRefresh(key: string, refresh: Promise<unknown>): boolean;

	private async refresh<T>(key: string, create: () => Promise<T>, opts: CacheOptions): Promise<T> {
		const value = await create();
		await this.set(key, value, { ttlMs: opts.ttlMs });
		return value;
	}

	abstract get<T>(key: string): Promise<CacheReadResult<T>>;
	abstract set<T>(key: string, value: T, opts: CacheOptions): Promise<void>;

	async getOrCreate<T>(
		key: string,
		create: () => Promise<T>,
		opts: CacheOptions
	): Promise<{ value: T; servedStale: boolean } | null> {
		const cached = await this.get<T>(key);
		if (cached.status === 'fresh') {
			return { value: cached.value, servedStale: false };
		}

		const claimed = await this.claimRefetch(key, refetchClaimWindowMs);
		if (!claimed) {
			return cached.status === 'stale' ? { value: cached.value, servedStale: true } : null;
		}

		const refresh = this.refresh(key, create, opts);
		if (cached.status === 'stale' && this.deferRefresh(key, refresh)) {
			return { value: cached.value, servedStale: true };
		}

		try {
			const value = await refresh;
			return { value, servedStale: false };
		} catch (error) {
			if (cached.status === 'stale') {
				return { value: cached.value, servedStale: true };
			}
			throw error;
		}
	}
}
