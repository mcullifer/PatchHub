import * as steam from '$lib/server/apis/steam';
import { json } from '@sveltejs/kit';

export async function GET({ url, fetch, setHeaders }) {
	const appid = url.searchParams.get('appid');
	const count = url.searchParams.get('count');
	if (appid === null || appid === '') return json([]);
	const response = await steam.news(appid, count || '10');
	if (!response) return json([]);
	setHeaders({ 'Cache-Control': 'max-age=300' });
	return json(response.appnews);
}
