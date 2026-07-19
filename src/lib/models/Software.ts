export type SoftwareSourceHealthStatus = 'fresh' | 'cached' | 'unavailable';

export type SoftwareSourceHealth = {
	status: SoftwareSourceHealthStatus;
	checkedAt: string | null;
	latestItemAt: string | null;
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
	feedUrl: string | null;
	searchUrl: string | null;
	supportUrl: string;
	releaseInfoUrl: string | null;
	cacheTtlMs: number;
	rendering: 'excerpt' | 'full';
};

export type SoftwareUpdateMetadata = {
	kbId: string | null;
	build: string | null;
	windowsVersion: string | null;
	updateType: string | null;
	servicingChannel: string | null;
	driverVersion: string | null;
	releaseNotesUrl: string | null;
	downloadUrl: string | null;
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
};

export type SoftwareSourceSummary = {
	source: SoftwareSource;
	latestUpdate: SoftwareUpdateEntry | null;
	updateCount: number;
	health: SoftwareSourceHealth;
	externalItemId: string | null;
};
