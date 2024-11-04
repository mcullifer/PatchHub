import { STEAM_API_URL } from "$env/static/private";
import type { ISteamAppNewsResponse } from "$lib/models/Steam.js";
import { json } from "@sveltejs/kit";

const NEWS_URL = '/ISteamNews/GetNewsForApp/v2/';

export async function GET({ url, fetch }) {
	const appid = url.searchParams.get('appid');
	const count = url.searchParams.get('count');
	if (appid === null || appid === '') return json([]);

	const response = await fetch(STEAM_API_URL + NEWS_URL + `?appid=${appid}&count=${count}`);
	const data = await response.json() as ISteamAppNewsResponse;
	return json(data.appnews);
}