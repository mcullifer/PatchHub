export type CacheReadResult<T> =
	{ status: 'fresh'; value: T } | { status: 'stale'; value: T } | { status: 'miss' };

export interface ICache {
	/** Peek only — never fetches upstream, never claims. */
	get<T>(key: string): Promise<CacheReadResult<T>>;
	set<T>(key: string, value: T, opts: { ttlMs: number }): Promise<void>;
	/** Full flow: fresh hit, or single-flight upstream fetch with stale fallback. */
	getOrCreate<T>(
		key: string,
		create: () => Promise<T>,
		opts: { ttlMs: number }
	): Promise<{ value: T; servedStale: boolean } | null>;
}
