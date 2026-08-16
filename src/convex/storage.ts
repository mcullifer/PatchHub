import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { requireServerSecret } from './lib/serverSecret';

export const generateBannerUploadUrl = mutation({
	args: { secret: v.string() },
	returns: v.string(),
	handler: async (ctx, { secret }) => {
		requireServerSecret(secret);
		return await ctx.storage.generateUploadUrl();
	}
});
