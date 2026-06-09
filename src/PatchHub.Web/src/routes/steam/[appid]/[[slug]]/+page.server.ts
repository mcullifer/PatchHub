import { SteamGameService } from '$lib/server/SteamGameService.js';
import * as steam from '$lib/server/apis/steam';
import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService.js';
import { getSteamGamePath } from '$lib/util/SteamRoute.js';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
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

	const news = steam.news(appid.toString(), '10').then((response) => response?.appnews ?? null);

	return {
		game: {
			appid,
			name: app.name,
			slug: app.slug,
			headerImageUrl: await getSteamHeaderImageUrl(fetch, appid)
		},
		news
	};
};
