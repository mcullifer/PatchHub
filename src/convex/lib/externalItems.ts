import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export type ExternalItemValues = {
	name: string;
	type: Doc<'externalItems'>['type'];
	externalId: string;
	slug: string;
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
			slug: values.slug,
			metadataJson: values.metadataJson,
			updatedAt: values.updatedAt
		});
		return true;
	}

	await ctx.db.insert('externalItems', values);
	return true;
}

export function parseSoftwareSourceMetadata(metadataJson: string): Record<string, unknown> {
	const metadata: unknown = JSON.parse(metadataJson);
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
		throw new Error('Software source metadata is invalid');
	}

	return metadata as Record<string, unknown>;
}

export async function resolveSoftwareSourceImageUrl(
	ctx: Pick<QueryCtx, 'db' | 'storage'>,
	metadataJson?: string
): Promise<string | null> {
	if (!metadataJson) return null;

	try {
		const metadata = parseSoftwareSourceMetadata(metadataJson);
		const storageId = metadata.imageStorageId;
		if (typeof storageId === 'string') {
			const normalizedId = ctx.db.system.normalizeId('_storage', storageId);
			if (normalizedId) return await ctx.storage.getUrl(normalizedId);
		}

		return typeof metadata.imageUrl === 'string' ? metadata.imageUrl : null;
	} catch {
		return null;
	}
}

function hasExternalItemChanges(existing: Doc<'externalItems'>, values: ExternalItemValues) {
	return (
		existing.name !== values.name ||
		existing.slug !== values.slug ||
		existing.metadataJson !== values.metadataJson
	);
}
