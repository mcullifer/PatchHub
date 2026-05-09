import { getSteamHeaderImageUrl } from '$lib/server/steam/SteamAssetService.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ fetch, params }) {
	const appid = Number.parseInt(params.appid, 10);
	if (!Number.isInteger(appid)) error(400, 'Invalid Steam app id');

	return json({
		headerImageUrl: await getSteamHeaderImageUrl(fetch, appid)
	});
}
