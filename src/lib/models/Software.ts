export type SoftwareSourceHealth = {
	available: boolean;
	error: string | null;
};

export type SoftwareSource = {
	id: string;
	name: string;
	slug: string;
	vendor: string;
	provider: string;
	sourceType: string;
	description: string;
	icon: string;
	imageUrl: string;
	imageAlt: string;
	adapter: 'atom-feed' | 'nvidia-driver-search';
	upstreamUrl: string;
	supportUrl: string;
	releaseInfoUrl: string | null;
	cacheTtlMs: number;
	rendering: 'excerpt' | 'full';
};

export type SoftwareUpdateMetadata = {
	updateType?: string;
	driverVersion?: string;
	releaseNotesUrl?: string;
	downloadUrl?: string;
};

export type SoftwareUpdateEntry = {
	id: string;
	title: string;
	summary: string;
	contentHtml: string | null;
	sourceUrl: string;
	publishedAt: string | null;
	updatedAt: string | null;
	authors: string[];
	metadata: SoftwareUpdateMetadata;
};

export type SoftwareSourceDetail = {
	source: SoftwareSource;
	entries: SoftwareUpdateEntry[];
	health: SoftwareSourceHealth;
	externalItemId: string | null;
};

export type SoftwareSourceSummary = {
	source: SoftwareSource;
	latestUpdate: SoftwareUpdateEntry | null;
	updateCount: number;
	health: SoftwareSourceHealth;
	externalItemId: string | null;
};
