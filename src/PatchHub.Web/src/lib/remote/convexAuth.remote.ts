import { command, getRequestEvent } from '$app/server';
import * as v from 'valibot';

export const getConvexAccessToken = command(
	v.object({
		forceRefreshToken: v.boolean()
	}),
	async () => {
		const event = getRequestEvent();
		if (!event.locals.auth.user) return null;

		return event.locals.auth.accessToken ?? null;
	}
);
