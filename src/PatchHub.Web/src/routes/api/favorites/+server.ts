import { requireInternalUser } from '$lib/server/auth/AuthContext';
import { db } from '$lib/server/db';
import { externalItem, externalItemFavorite } from '$lib/server/db/schema';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = await requireInternalUser(event);
	const result = await db
		.select({
			id: externalItem.id,
			name: externalItem.name,
			normalizedName: externalItem.normalizedName,
			type: externalItem.type,
			externalId: externalItem.externalId
		})
		.from(externalItemFavorite)
		.innerJoin(externalItem, eq(externalItem.id, externalItemFavorite.externalItemId))
		.where(eq(externalItemFavorite.userId, user.id));

	return json({
		favorites: result
	});
};

export const POST: RequestHandler = async (event) => {
	const user = await requireInternalUser(event);
	const { request } = event;
	const body = await request.json();
	const rawExternalItemId = body.externalItemId ?? body.catalogId;
	if (!rawExternalItemId) error(400, 'External item ID required');

	const externalItemId = Number.parseInt(String(rawExternalItemId));
	if (Number.isNaN(externalItemId)) error(400, 'Invalid external item ID');

	await db.insert(externalItemFavorite).values({
		userId: user.id,
		externalItemId,
		createdAt: new Date()
	});
	return new Response();
};
