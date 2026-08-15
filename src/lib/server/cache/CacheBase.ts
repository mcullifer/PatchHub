import { Time } from '$lib/util/time';
import type { CacheReadResult, ICache } from './ICache';

const refetchClaimWindowMs = Time.SECOND * 30;
const initialRefetchPollMs = 100;
const maximumRefetchPollMs = Time.SECOND;

type CacheOptions = {
	ttlMs: number;
};

export abstract class CacheBase implements ICache {
	protected abstract claimRefetch(key: string, claimWindowMs: number): Promise<boolean>;

	private async refresh<T>(key: string, create: () => Promise<T>, opts: CacheOptions): Promise<T> {
		const value = await create();
		await this.set(key, value, { ttlMs: opts.ttlMs });
		return value;
	}

	private async waitForRefresh<T>(key: string): Promise<CacheReadResult<T>> {
		const deadline = Date.now() + refetchClaimWindowMs;
		let pollMs = initialRefetchPollMs;
		let cached = await this.get<T>(key);

		while (cached.status !== 'fresh' && Date.now() < deadline) {
			const remainingMs = deadline - Date.now();
			await wait(Math.min(pollMs, remainingMs));
			cached = await this.get<T>(key);
			pollMs = Math.min(pollMs * 2, maximumRefetchPollMs);
		}

		return cached;
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
		if (claimed) {
			try {
				const value = await this.refresh(key, create, opts);
				return { value, servedStale: false };
			} catch (error) {
				if (cached.status === 'stale') {
					return { value: cached.value, servedStale: true };
				}
				throw error;
			}
		}

		const refreshed = await this.waitForRefresh<T>(key);
		if (refreshed.status === 'fresh') {
			return { value: refreshed.value, servedStale: false };
		}

		const fallback = refreshed.status === 'stale' ? refreshed : cached;
		return fallback.status === 'stale' ? { value: fallback.value, servedStale: true } : null;
	}
}

function wait(durationMs: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, durationMs));
}
