import type { Doc } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export type ExternalItemValues = {
	name: string;
	normalizedName: string;
	type: string;
	externalId: string;
	source?: string;
	appType: string;
	slug: string;
	searchName: string;
	metadataJson?: string;
	updatedAt: number;
};

// Upsert keyed on (type, externalId), mirroring the old sqlite unique index.
export async function upsertExternalItem(
	ctx: MutationCtx,
	values: ExternalItemValues
): Promise<boolean> {
	const existing = await ctx.db
		.query('externalItems')
		.withIndex('by_type_and_externalId', (q) =>
			q.eq('type', values.type).eq('externalId', values.externalId)
		)
		.unique();

	if (existing) {
		if (!hasExternalItemChanges(existing, values)) {
			return false;
		}

		await ctx.db.patch(existing._id, {
			name: values.name,
			normalizedName: values.normalizedName,
			source: values.source,
			appType: values.appType,
			slug: values.slug,
			searchName: values.searchName,
			metadataJson: values.metadataJson,
			updatedAt: values.updatedAt
		});
		return true;
	}

	await ctx.db.insert('externalItems', {
		...values,
		createdAt: values.updatedAt
	});
	return true;
}

function hasExternalItemChanges(existing: Doc<'externalItems'>, values: ExternalItemValues) {
	return (
		existing.name !== values.name ||
		existing.normalizedName !== values.normalizedName ||
		existing.source !== values.source ||
		existing.appType !== values.appType ||
		existing.slug !== values.slug ||
		existing.searchName !== values.searchName ||
		existing.metadataJson !== values.metadataJson
	);
}
