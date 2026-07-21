import { command, getRequestEvent, query } from '$app/server';
import { captureServerEvent } from '$lib/server/analytics';
import { getAuthContext, requireInternalUser } from '$lib/server/auth/AuthContext';
import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import * as v from 'valibot';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';

export const getFavorites = query(async () => {
	const event = getRequestEvent();
	const { workosUser, internalUserId } = await getAuthContext(event);
	if (!workosUser || !internalUserId) {
		return { externalItems: [], projects: [] };
	}

	return await createConvexClient().query(api.favorites.getForUser, {
		secret: getConvexServerSecret(),
		authProviderId: workosUser.id
	});
});

export const addExternalItemFavorite = command(v.string(), async (externalItemId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await createConvexClient().mutation(api.favorites.addExternalItem, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		externalItemId: externalItemId as Id<'externalItems'>
	});
	await captureServerEvent(event, dbUser.authProviderId, {
		name: 'external item favorite added'
	});
});

export const removeExternalItemFavorite = command(v.string(), async (externalItemId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await createConvexClient().mutation(api.favorites.removeExternalItem, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		externalItemId: externalItemId as Id<'externalItems'>
	});
	await captureServerEvent(event, dbUser.authProviderId, {
		name: 'external item favorite removed'
	});
});

export const addProjectFavorite = command(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await createConvexClient().mutation(api.favorites.addProject, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		projectId: projectId as Id<'projects'>
	});
	await captureServerEvent(event, dbUser.authProviderId, {
		name: 'project favorite added'
	});
});

export const removeProjectFavorite = command(v.string(), async (projectId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await createConvexClient().mutation(api.favorites.removeProject, {
		secret: getConvexServerSecret(),
		authProviderId: dbUser.authProviderId,
		projectId: projectId as Id<'projects'>
	});
	await captureServerEvent(event, dbUser.authProviderId, {
		name: 'project favorite removed'
	});
});
