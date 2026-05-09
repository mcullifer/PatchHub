import { SteamGameService } from '$lib/server/SteamGameService.js';
import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService.js';
import { ApiService } from '$lib/services/ApiService.js';
import { getSteamGamePath } from '$lib/util/SteamRoute.js';
import { error, redirect } from '@sveltejs/kit';

export async function load({ fetch, params, url }) {
	const appid = Number.parseInt(params.appid, 10);
	if (!Number.isInteger(appid)) error(404, 'Steam game not found');

	const app = await SteamGameService.getApp(appid);
	if (!app) error(404, 'Steam game not found');

	const canonicalPath = getSteamGamePath({
		appid,
		name: app.name,
		slug: app.slug
	});

	if (url.pathname !== canonicalPath) {
		redirect(308, canonicalPath);
	}

	const api = new ApiService(fetch);

	return {
		game: {
			appid,
			name: app.name,
			slug: app.slug,
			headerImageUrl: await getSteamHeaderImageUrl(fetch, appid)
		},
		news: api.games.news(appid, 10)
	};
}
