import { getRequestEvent, query } from '$app/server';
import type { SoftwareSourceSummary } from '$lib/models/Software';
import { getSourceSummaries } from '$lib/server/software/updates';

export const getSoftwareSourceSummaries = query(async (): Promise<SoftwareSourceSummary[]> => {
	const event = getRequestEvent();
	return getSourceSummaries(6, event.fetch);
});
