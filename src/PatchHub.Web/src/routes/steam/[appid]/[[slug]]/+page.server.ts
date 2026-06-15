import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService.js';
import { findSteamAppByAppId } from '$lib/server/steam/SteamCatalogRepository.js';
import { getSteamGamePath } from '$lib/util/SteamRoute.js';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const appid = Number.parseInt(params.appid, 10);
	if (!Number.isInteger(appid)) error(404, 'Steam game not found');

	const app = await findSteamAppByAppId(appid);
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
			headerImageUrl: await getSteamHeaderImageUrl(fetch, appid)
		}
	};
};
