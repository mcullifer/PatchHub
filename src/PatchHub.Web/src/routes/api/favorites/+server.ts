import { db } from '$lib/server/db';
import { catalog, favorite } from '$lib/server/db/schema';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user === null) error(401, 'Unauthorized');
	const result = await db
		.select({
			id: favorite.catalogId,
			name: catalog.name,
			normalizedName: catalog.normalizedName,
			type: catalog.type,
			createdBy: catalog.createdBy,
			externalId: catalog.externalId
		})
		.from(favorite)
		.where(eq(favorite.userId, locals.user.id))
		.leftJoin(catalog, eq(catalog.id, favorite.catalogId));

	return json({
		favorites: result
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const body = await request.json();
	if (!body.catalogId) error(400, 'Catalog ID required');
	const catalogId = parseInt(body.catalogId);
	if (isNaN(catalogId)) error(400, 'Invalid Catalog ID');
	await db.insert(favorite).values({
		userId: locals.user.id,
		catalogId
	});
	return new Response();
};
