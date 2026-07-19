import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { api } from '$convex/_generated/api';
import { CacheBase } from './CacheBase';
import type { CacheReadResult } from './ICache';

export class ConvexCache extends CacheBase {
	async get<T>(key: string): Promise<CacheReadResult<T>> {
		const entry = await createConvexClient().query(api.cache.get, {
			secret: getConvexServerSecret(),
			key
		});
		if (!entry) return { status: 'miss' };

		return {
			status: entry.expiresAt > Date.now() ? 'fresh' : 'stale',
			value: JSON.parse(entry.value) as T
		};
	}

	async set<T>(key: string, value: T, opts: { ttlMs: number }): Promise<void> {
		const serializedValue = JSON.stringify(value);
		if (serializedValue === undefined) {
			throw new Error(`Cache value for ${key} is not JSON-serializable`);
		}

		await createConvexClient().mutation(api.cache.set, {
			secret: getConvexServerSecret(),
			key,
			value: serializedValue,
			ttlMs: opts.ttlMs
		});
	}

	protected async claimRefetch(key: string, claimWindowMs: number): Promise<boolean> {
		return await createConvexClient().mutation(api.cache.claimRefetch, {
			secret: getConvexServerSecret(),
			key,
			claimWindowMs
		});
	}
}
