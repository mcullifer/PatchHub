import { api } from '$convex/_generated/api';
import { createConvexClient } from '$lib/server/convex';
import { getSteamGamePath } from '$lib/util/SteamRoute';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const appid = Number.parseInt(params.appid, 10);
	if (!Number.isInteger(appid)) error(404, 'Steam game not found');

	const app = await createConvexClient().query(api.catalog.getSteamAppByAppId, { appid });
	if (!app) error(404, 'Steam game not found');

	const canonicalPath = getSteamGamePath({
		appid,
		name: app.name,
		slug: app.slug
	});

	if (url.pathname !== canonicalPath) {
		redirect(308, canonicalPath);
	}

	return {
		game: {
			appid,
			name: app.name,
			slug: app.slug,
			externalItemId: app.id
		}
	};
};
