import { Time } from '$lib/util/time';
import type { CacheReadResult, ICache } from './ICache';

const refetchClaimWindowMs = Time.SECOND * 30;

export abstract class CacheBase implements ICache {
	abstract get<T>(key: string): Promise<CacheReadResult<T>>;
	abstract set<T>(key: string, value: T, opts: { ttlMs: number }): Promise<void>;

	/** Atomically claim the right to refetch. Protected — exists only to serve getOrCreate. */
	protected abstract claimRefetch(key: string, claimWindowMs: number): Promise<boolean>;

	async getOrCreate<T>(
		key: string,
		create: () => Promise<T>,
		opts: { ttlMs: number }
	): Promise<{ value: T; servedStale: boolean } | null> {
		const cached = await this.get<T>(key);
		if (cached.status === 'fresh') {
			return { value: cached.value, servedStale: false };
		}

		const claimed = await this.claimRefetch(key, refetchClaimWindowMs);
		if (!claimed) {
			return cached.status === 'stale' ? { value: cached.value, servedStale: true } : null;
		}

		let value: T;
		try {
			value = await create();
		} catch (error) {
			if (cached.status === 'stale') {
				return { value: cached.value, servedStale: true };
			}
			throw error;
		}

		await this.set(key, value, opts);
		return { value, servedStale: false };
	}
}
