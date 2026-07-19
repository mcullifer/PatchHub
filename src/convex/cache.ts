import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';

export const get = query({
	args: { secret: v.string(), key: v.string() },
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const entry = await ctx.db
			.query('cacheEntries')
			.withIndex('by_key', (index) => index.eq('key', args.key))
			.unique();

		return entry?.value === undefined ? null : { value: entry.value, expiresAt: entry.expiresAt };
	}
});

export const set = mutation({
	args: {
		secret: v.string(),
		key: v.string(),
		value: v.string(),
		ttlMs: v.number()
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const now = Date.now();
		const entry = await ctx.db
			.query('cacheEntries')
			.withIndex('by_key', (index) => index.eq('key', args.key))
			.unique();
		const value = {
			value: args.value,
			expiresAt: now + args.ttlMs,
			updatedAt: now,
			refetchClaimedAt: undefined
		};

		if (entry) {
			await ctx.db.patch(entry._id, value);
			return;
		}

		await ctx.db.insert('cacheEntries', { key: args.key, ...value });
	}
});

export const claimRefetch = mutation({
	args: {
		secret: v.string(),
		key: v.string(),
		claimWindowMs: v.number()
	},
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		const now = Date.now();
		const entry = await ctx.db
			.query('cacheEntries')
			.withIndex('by_key', (index) => index.eq('key', args.key))
			.unique();

		if (!entry) {
			await ctx.db.insert('cacheEntries', {
				key: args.key,
				expiresAt: 0,
				updatedAt: now,
				refetchClaimedAt: now
			});
			return true;
		}

		const claimCutoff = now - args.claimWindowMs;
		const hasActiveClaim =
			entry.refetchClaimedAt !== undefined && entry.refetchClaimedAt >= claimCutoff;
		if (entry.expiresAt > now || hasActiveClaim) return false;

		await ctx.db.patch(entry._id, { refetchClaimedAt: now });
		return true;
	}
});
