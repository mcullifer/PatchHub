import { createConvexClient, getConvexServerSecret } from '$lib/server/convex';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/SoftwareSourceRegistry';
import { normalizeSearchName } from '$convex/lib/strings';
import { api } from '$convex/_generated/api';

export class SoftwareCatalogService {
	static async getExternalItemId(externalId: string): Promise<string | null> {
		return await createConvexClient().query(api.catalog.getItemIdByTypeAndExternalId, {
			type: 'software',
			externalId
		});
	}

	static async upsertRegisteredSources(): Promise<void> {
		const convex = createConvexClient();
		for (const source of getSoftwareSources()) {
			await this.upsertSource(source.slug, convex);
		}
	}

	static async upsertSource(slug: string, convex = createConvexClient()): Promise<void> {
		const source = getSoftwareSource(slug);
		if (!source) return;

		await convex.mutation(api.catalog.upsertSoftwareSource, {
			secret: getConvexServerSecret(),
			name: source.name,
			normalizedName: normalizeSearchName(source.name),
			externalId: source.id,
			source: source.vendor,
			slug: source.slug,
			searchName: normalizeSearchName(`${source.name} ${source.vendor}`),
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
