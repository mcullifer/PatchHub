import { db } from '$lib/server/db';
import { externalItem } from '$lib/server/db/schema';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/SoftwareSourceRegistry';
import { normalizeSearchName } from '$lib/util/StringUtils';

export class SoftwareCatalogService {
	static async getExternalItemId(slug: string): Promise<number | null> {
		const item = await db.query.externalItem.findFirst({
			where: (items, { and, eq }) => and(eq(items.type, 'software'), eq(items.slug, slug))
		});

		return item?.id ?? null;
	}

	static async upsertRegisteredSources(): Promise<void> {
		for (const source of getSoftwareSources()) {
			await this.upsertSource(source.slug);
		}
	}

	static async upsertSource(slug: string): Promise<void> {
		const source = getSoftwareSource(slug);
		if (!source) return;

		const now = new Date();
		const values = {
			name: source.name,
			normalizedName: normalizeSearchName(source.name),
			type: 'software',
			externalId: source.id,
			source: source.vendor,
			appType: 'software',
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
			}),
			createdAt: now,
			updatedAt: now
		};

		await db
			.insert(externalItem)
			.values(values)
			.onConflictDoUpdate({
				target: [externalItem.type, externalItem.externalId],
				set: {
					name: values.name,
					normalizedName: values.normalizedName,
					source: values.source,
					appType: values.appType,
					slug: values.slug,
					searchName: values.searchName,
					metadataJson: values.metadataJson,
					updatedAt: values.updatedAt
				}
			});
	}
}
