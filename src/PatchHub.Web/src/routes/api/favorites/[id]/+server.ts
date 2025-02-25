import { db } from '$lib/server/db';
import { favorite } from '$lib/server/db/schema';
import { type RequestHandler, error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!params.id) error(400, 'ID required');
	const id = parseInt(params.id);
	if (isNaN(id)) error(400, 'Invalid ID');
	await db
		.delete(favorite)
		.where(and(eq(favorite.catalogId, id), eq(favorite.userId, locals.user.id)));
	return json({ success: true });
};
