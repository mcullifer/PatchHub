import { query } from '$app/server';
import type { ExternalItemSearchResult } from '$lib/models/ExternalItem';
import { createConvexClient } from '$lib/server/convex';
import { api } from '$convex/_generated/api';
import * as v from 'valibot';

export const searchCatalog = query(
	v.string(),
	async (searchQuery): Promise<ExternalItemSearchResult[]> => {
		if (!searchQuery.trim()) return [];
		return await createConvexClient().query(api.catalog.searchExternalItems, {
			query: searchQuery
		});
	}
);
