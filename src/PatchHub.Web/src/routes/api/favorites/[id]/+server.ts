import { requireInternalUser } from '$lib/server/auth/AuthContext';
import { db } from '$lib/server/db';
import { externalItemFavorite } from '$lib/server/db/schema';
import { type RequestHandler, error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async (event) => {
	const user = await requireInternalUser(event);
	const { params } = event;
	if (!params.id) error(400, 'ID required');

	const id = Number.parseInt(params.id);
	if (Number.isNaN(id)) error(400, 'Invalid ID');

	await db
		.delete(externalItemFavorite)
		.where(
			and(eq(externalItemFavorite.externalItemId, id), eq(externalItemFavorite.userId, user.id))
		);
	return json({ success: true });
};
