import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { getSoftwareSource } from '$lib/server/software/SoftwareSourceRegistry';
import { api } from '$convex/_generated/api';

export class SoftwareCatalogService {
	static async getExternalItemId(externalId: string): Promise<string | null> {
		return await createConvexClient().query(api.catalog.getItemIdByTypeAndExternalId, {
			type: 'software',
			externalId
		});
	}

	static async upsertSource(slug: string, convex = createConvexClient()): Promise<void> {
		const source = getSoftwareSource(slug);
		if (!source) return;

		await convex.mutation(api.catalog.upsertSoftwareSource, {
			secret: getConvexServerSecret(),
			name: source.name,
			externalId: source.id,
			slug: source.slug,
			metadataJson: JSON.stringify({
				vendor: source.vendor,
				provider: source.provider,
				sourceType: source.sourceType,
				imageUrl: source.imageUrl,
				adapter: source.adapter,
				feedUrl: source.feedUrl,
				searchUrl: source.searchUrl,
				supportUrl: source.supportUrl,
				releaseInfoUrl: source.releaseInfoUrl
			})
		});
	}
}
