import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import type { ISteamAppListResponse } from '../src/lib/models/Steam';

async function updateSteamApps(lastAppId?: number) {
	const baseUrl = process.env.STEAM_API_URL;
	const apiKey = process.env.STEAM_API_KEY;
	if (!baseUrl) throw new Error('Steam API URL not found');
	if (!apiKey) throw new Error('Steam API key not found');

	const url = baseUrl + '/IStoreService/GetAppList/v1/';
	const params = new URLSearchParams({
		key: apiKey,
		include_games: 'true'
	});
	if (lastAppId !== undefined) {
		params.append('last_appid', lastAppId.toString());
	}

	const response = await fetch(`${url}?${params.toString()}`);
	if (!response.ok) {
		console.log('Failed to fetch');
		return;
	}

	try {
		const apps = (await response.json()) as ISteamAppListResponse;
		if (!apps.response || !apps.response.apps || !apps.response.apps.length) {
			console.log('No new apps found');
			return;
		}
		const fileName = `${new Date().getTime()}.json`;
		writeFileSync(
			`src/lib/server/db/seeds/data/steam_games/${fileName}`,
			JSON.stringify(apps.response),
			{
				encoding: 'utf-8'
			}
		);
		console.log('Apps updated, new last_appid:', apps.response.last_appid);
		if (apps.response.have_more_results) {
			return apps.response.last_appid;
		}
	} catch {
		console.log('Failed to parse response');
	}
}

async function getNextNSteamApps(iterations: number) {
	let lastAppId: number | undefined = 3535470;
	for (let i = 0; i < iterations; i++) {
		lastAppId = await updateSteamApps(lastAppId);
		if (lastAppId === undefined) {
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}

dotenv.config();
getNextNSteamApps(10);
