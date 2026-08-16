import type { SoftwareFeedRendering, SoftwareSource } from '$lib/models/Software';
import { createConvexClient } from '$lib/server/convex';
import { Time } from '$lib/util/time';
import { api } from '$convex/_generated/api';

type SoftwareSourceMetadata = {
	vendor: string;
	provider: string;
	sourceType: string;
	imageUrl?: string;
	imageStorageId?: string;
	adapter: SoftwareSource['adapter'];
	rendering?: SoftwareFeedRendering;
	feedUrl: string | null;
	searchUrl: string | null;
	supportUrl: string | null;
	releaseInfoUrl: string | null;
};

type SoftwareSourceRecord = {
	_id: string;
	name: string;
	externalId?: string;
	slug: string;
	metadataJson?: string;
	resolvedImageUrl?: string | null;
};

export type StoredSoftwareSource = {
	source: SoftwareSource;
	externalItemId: string;
};

export async function getSoftwareSources(): Promise<StoredSoftwareSource[]> {
	const convex = createConvexClient();
	const records = await convex.query(api.catalog.listSoftwareSources, {});
	return records.map(parseSoftwareSourceRecord);
}

export async function getSoftwareSource(slug: string): Promise<StoredSoftwareSource | null> {
	return (await getSoftwareSources()).find((item) => item.source.slug === slug) ?? null;
}

export function parseSoftwareSourceRecord(record: SoftwareSourceRecord): StoredSoftwareSource {
	if (!record.externalId || !record.metadataJson) {
		throw new Error(`Software source ${record.slug} is missing its stored configuration`);
	}

	const metadata = JSON.parse(record.metadataJson) as SoftwareSourceMetadata;
	const upstreamUrl = metadata.adapter === 'atom-feed' ? metadata.feedUrl : metadata.searchUrl;
	if (!upstreamUrl) {
		throw new Error(`Software source ${record.slug} does not define its upstream URL`);
	}
	const imageUrl = record.resolvedImageUrl ?? metadata.imageUrl;
	if (!imageUrl) {
		throw new Error(`Software source ${record.slug} does not define its card image`);
	}

	return {
		externalItemId: record._id,
		source: {
			id: record.externalId,
			name: record.name,
			slug: record.slug,
			vendor: metadata.vendor,
			provider: metadata.provider,
			sourceType: metadata.sourceType,
			description: `Updates published by ${metadata.provider}.`,
			icon: metadata.adapter === 'nvidia-driver-search' ? 'memory' : 'rss_feed',
			imageUrl,
			imageAlt: `${record.name} logo`,
			adapter: metadata.adapter,
			upstreamUrl,
			supportUrl: metadata.supportUrl ?? upstreamUrl,
			releaseInfoUrl: metadata.releaseInfoUrl,
			cacheTtlMs: Time.MINUTE * 5,
			rendering: metadata.rendering ?? null
		}
	};
}
