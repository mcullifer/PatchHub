import { command, getRequestEvent, query } from '$app/server';
import { getAuthContext, requireInternalUser } from '$lib/server/auth/AuthContext';
import { db } from '$lib/server/db';
import {
	externalItem,
	externalItemFavorite,
	project,
	projectFavorite
} from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import * as v from 'valibot';

export const getFavorites = query(async () => {
	const event = getRequestEvent();
	const { internalUserId } = await getAuthContext(event);
	if (!internalUserId) {
		return { externalItems: [], projects: [] };
	}

	const externalItemResult = await db
		.select({
			id: externalItem.id,
			name: externalItem.name,
			normalizedName: externalItem.normalizedName,
			type: externalItem.type,
			externalId: externalItem.externalId
		})
		.from(externalItemFavorite)
		.innerJoin(externalItem, eq(externalItem.id, externalItemFavorite.externalItemId))
		.where(eq(externalItemFavorite.userId, internalUserId));

	// Get project favorites
	const projectResult = await db
		.select({
			id: project.id,
			name: project.name,
			normalizedName: project.normalizedName,
			slug: project.slug
		})
		.from(projectFavorite)
		.innerJoin(project, eq(project.id, projectFavorite.projectId))
		.where(eq(projectFavorite.userId, internalUserId));

	return {
		externalItems: externalItemResult.map((r) => ({
			id: r.id,
			name: r.name,
			normalizedName: r.normalizedName,
			type: r.type,
			externalId: r.externalId
		})),
		projects: projectResult.map((r) => ({
			id: r.id,
			name: r.name,
			normalizedName: r.normalizedName,
			slug: r.slug
		}))
	};
});

export const addExternalItemFavorite = command(v.number(), async (externalItemId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await db.insert(externalItemFavorite).values({
		userId: dbUser.id,
		externalItemId,
		createdAt: new Date()
	});
});

export const removeExternalItemFavorite = command(v.number(), async (externalItemId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await db
		.delete(externalItemFavorite)
		.where(
			and(
				eq(externalItemFavorite.externalItemId, externalItemId),
				eq(externalItemFavorite.userId, dbUser.id)
			)
		);
});

export const addProjectFavorite = command(v.number(), async (projectId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await db.insert(projectFavorite).values({
		userId: dbUser.id,
		projectId,
		createdAt: new Date()
	});
});

export const removeProjectFavorite = command(v.number(), async (projectId) => {
	const event = getRequestEvent();
	const dbUser = await requireInternalUser(event);

	await db
		.delete(projectFavorite)
		.where(and(eq(projectFavorite.projectId, projectId), eq(projectFavorite.userId, dbUser.id)));
});
