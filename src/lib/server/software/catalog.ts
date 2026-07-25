import type { SoftwareSource } from '$lib/models/Software';
import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { api } from '$convex/_generated/api';

export async function ensureExternalItemId(source: SoftwareSource) {
	const convex = createConvexClient();
	const existingId = await convex.query(api.catalog.getItemIdByTypeAndExternalId, {
		type: 'software',
		externalId: source.id
	});
	if (existingId) return existingId;

	await convex.mutation(api.catalog.upsertSoftwareSource, {
		secret: getConvexServerSecret(),
		name: source.name,
		externalId: source.id,
		slug: source.slug
	});

	return convex.query(api.catalog.getItemIdByTypeAndExternalId, {
		type: 'software',
		externalId: source.id
	});
}
