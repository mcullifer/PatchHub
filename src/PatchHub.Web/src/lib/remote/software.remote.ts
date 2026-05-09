import { query } from '$app/server';
import type { SoftwareSourceSummary } from '$lib/models/Software';
import { SoftwareUpdateService } from '$lib/server/software/SoftwareUpdateService';

export const getSoftwareSourceSummaries = query(async (): Promise<SoftwareSourceSummary[]> => {
	return SoftwareUpdateService.getSourceSummaries(6);
});
