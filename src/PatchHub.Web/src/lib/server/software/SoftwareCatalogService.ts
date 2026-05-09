import { db } from '$lib/server/db';
import { externalItem } from '$lib/server/db/schema';
import { getSoftwareSource, getSoftwareSources } from '$lib/server/software/SoftwareSourceRegistry';
import { normalizeSearchName } from '$lib/util/StringUtils';
import { eq } from 'drizzle-orm';

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
			isSearchable: true,
			trackStatus: 'trackable',
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
			firstSeenAt: now,
			lastSeenAt: now,
			lastSyncedAt: now,
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
					isSearchable: values.isSearchable,
					trackStatus: values.trackStatus,
					metadataJson: values.metadataJson,
					lastSeenAt: values.lastSeenAt,
					lastSyncedAt: values.lastSyncedAt,
					updatedAt: values.updatedAt
				}
			});
	}

	static async updateSourceFreshness(slug: string, checkedAt: Date, latestItemAt: Date | null) {
		await db
			.update(externalItem)
			.set({
				lastNewsCheckedAt: checkedAt,
				lastNewsItemAt: latestItemAt,
				trackStatus: 'trackable',
				updatedAt: checkedAt
			})
			.where(eq(externalItem.slug, slug));
	}
}
