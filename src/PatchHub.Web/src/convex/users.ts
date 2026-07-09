import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';
import { normalizeUsername, validateUsername } from './lib/usernames';

type UserLookupCtx = Pick<QueryCtx, 'auth' | 'db'>;

export async function findUserByAuthProviderId(
	ctx: UserLookupCtx,
	authProviderId: string
): Promise<Doc<'users'> | null> {
	return await ctx.db
		.query('users')
		.withIndex('by_authProviderId', (q) => q.eq('authProviderId', authProviderId))
		.unique();
}

export async function findUserByUsername(
	ctx: UserLookupCtx,
	username: string
): Promise<Doc<'users'> | null> {
	// Usernames are stored normalized, so an index lookup suffices.
	return await ctx.db
		.query('users')
		.withIndex('by_username', (q) => q.eq('username', normalizeUsername(username)))
		.unique();
}

export async function findCurrentUser(ctx: UserLookupCtx): Promise<Doc<'users'> | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return null;

	return await findUserByAuthProviderId(ctx, identity.subject);
}

export async function requireCurrentUser(ctx: UserLookupCtx): Promise<Doc<'users'>> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error('Not authenticated');
	}

	const user = await findUserByAuthProviderId(ctx, identity.subject);
	if (!user || user.deletedAt) {
		throw new Error('User not found');
	}

	return user;
}

export const getByAuthProviderId = query({
	args: { secret: v.string(), authProviderId: v.string() },
	handler: async (ctx, args) => {
		requireServerSecret(args.secret);
		return await findUserByAuthProviderId(ctx, args.authProviderId);
	}
});

export const isUsernameTaken = query({
	args: { username: v.string() },
	handler: async (ctx, args) => {
		return (await findUserByUsername(ctx, args.username)) !== null;
	}
});

export const getOrCreate = mutation({
	args: {
		secret: v.string(),
		authProviderId: v.string(),
		email: v.optional(v.string()),
		username: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	},
	handler: async (ctx, args): Promise<Doc<'users'>> => {
		requireServerSecret(args.secret);

		const existingUser = await findUserByAuthProviderId(ctx, args.authProviderId);
		if (existingUser) {
			if (existingUser.deletedAt) {
				throw new Error('Account is disabled');
			}

			return existingUser;
		}

		const usernameValidation = validateUsername(args.username);
		if (!usernameValidation.ok) {
			throw new Error(usernameValidation.message);
		}

		const existingUsername = await findUserByUsername(ctx, usernameValidation.username);
		if (existingUsername) {
			throw new Error('Username is already taken');
		}

		const userId = await ctx.db.insert('users', {
			authProviderId: args.authProviderId,
			email: args.email,
			username: usernameValidation.username,
			platformRole: 'member',
			createdAt: args.createdAt,
			updatedAt: args.updatedAt
		});

		const user = await ctx.db.get(userId);
		if (!user) {
			throw new Error('Unable to create user');
		}

		return user;
	}
});
