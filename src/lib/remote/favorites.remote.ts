import { command, getRequestEvent, query } from '$app/server';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';
import { captureServerEvent } from '$lib/server/analytics';
import { requireAuth } from '$lib/server/auth/authContext';
import { createAuthenticatedConvexClient } from '$lib/server/convex';
import * as v from 'valibot';

const favoriteIdSchema = v.string();

export const getFavorites = query(async () => {
	const event = getRequestEvent();
	if (!event.locals.auth.user) {
		return { externalItems: [], projectIds: [] };
	}

	const convex = createAuthenticatedConvexClient(event);
	return await convex.query(api.favorites.list, {});
});

export const addExternalItemFavorite = command(favoriteIdSchema, async (externalItemId) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	await convex.mutation(api.favorites.addExternalItem, {
		externalItemId: externalItemId as Id<'externalItems'>
	});
	await captureServerEvent(event, user.id, {
		name: 'external item favorite added'
	});
});

export const removeExternalItemFavorite = command(favoriteIdSchema, async (externalItemId) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	await convex.mutation(api.favorites.removeExternalItem, {
		externalItemId: externalItemId as Id<'externalItems'>
	});
	await captureServerEvent(event, user.id, {
		name: 'external item favorite removed'
	});
});

export const addProjectFavorite = command(favoriteIdSchema, async (projectId) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	await convex.mutation(api.favorites.addProject, {
		projectId: projectId as Id<'projects'>
	});
	await captureServerEvent(event, user.id, {
		name: 'project favorite added'
	});
});

export const removeProjectFavorite = command(favoriteIdSchema, async (projectId) => {
	const event = getRequestEvent();
	const user = requireAuth(event);
	const convex = createAuthenticatedConvexClient(event);

	await convex.mutation(api.favorites.removeProject, {
		projectId: projectId as Id<'projects'>
	});
	await captureServerEvent(event, user.id, {
		name: 'project favorite removed'
	});
});
