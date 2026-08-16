import type { CacheReadResult, ICache } from './ICache';

type CacheEntry = {
	value: unknown;
	expiresAt: number;
};

export class MemoryCache implements ICache {
	private readonly entries = new Map<string, CacheEntry>();
	private readonly refreshes = new Map<string, Promise<unknown>>();

	async get<T>(key: string): Promise<CacheReadResult<T>> {
		const entry = this.entries.get(key);
		if (!entry) return { status: 'miss' };

		return {
			status: entry.expiresAt > Date.now() ? 'fresh' : 'stale',
			value: entry.value as T
		};
	}

	async set<T>(key: string, value: T, opts: { ttlMs: number }): Promise<void> {
		this.entries.set(key, {
			value,
			expiresAt: Date.now() + opts.ttlMs
		});
	}

	async getOrCreate<T>(
		key: string,
		create: (cachedValue: T | undefined) => Promise<T>,
		opts: { ttlMs: number }
	): Promise<{ value: T; servedStale: boolean }> {
		const cached = await this.get<T>(key);
		if (cached.status === 'fresh') {
			return { value: cached.value, servedStale: false };
		}

		try {
			const cachedValue = cached.status === 'miss' ? undefined : cached.value;
			const value = await this.getOrStartRefresh(key, () => create(cachedValue), opts);
			return { value, servedStale: false };
		} catch (error) {
			if (cached.status === 'stale') {
				return { value: cached.value, servedStale: true };
			}
			throw error;
		}
	}

	private getOrStartRefresh<T>(
		key: string,
		create: () => Promise<T>,
		opts: { ttlMs: number }
	): Promise<T> {
		const activeRefresh = this.refreshes.get(key);
		if (activeRefresh) return activeRefresh as Promise<T>;

		const refresh = this.refresh(key, create, opts);
		this.refreshes.set(key, refresh);
		refresh.then(
			() => this.clearRefresh(key, refresh),
			() => this.clearRefresh(key, refresh)
		);
		return refresh;
	}

	private async refresh<T>(
		key: string,
		create: () => Promise<T>,
		opts: { ttlMs: number }
	): Promise<T> {
		const value = await create();
		await this.set(key, value, opts);
		return value;
	}

	private clearRefresh(key: string, refresh: Promise<unknown>) {
		if (this.refreshes.get(key) === refresh) {
			this.refreshes.delete(key);
		}
	}
}
