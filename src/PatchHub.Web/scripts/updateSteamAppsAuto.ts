import dotenv from 'dotenv';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { ISteamAppListResponse } from '../src/lib/models/Steam';

const STEAM_GAMES_DIR = 'src/lib/server/db/seeds/data/steam_games';

function getLastAppIdFromExistingFiles(): number {
	if (!existsSync(STEAM_GAMES_DIR)) {
		console.log('📁 No steam_games directory found, starting from 0');
		return 0;
	}

	const files = readdirSync(STEAM_GAMES_DIR).filter((f) => f.endsWith('.json'));
	if (files.length === 0) {
		console.log('📁 No existing JSON files found, starting from 0');
		return 0;
	}

	let maxLastAppId = 0;
	let maxFile = '';

	for (const file of files) {
		try {
			const content = readFileSync(`${STEAM_GAMES_DIR}/${file}`, 'utf-8');
			const data = JSON.parse(content);
			if (data.last_appid && data.last_appid > maxLastAppId) {
				maxLastAppId = data.last_appid;
				maxFile = file;
			}
		} catch (e) {
			console.warn(`⚠️  Failed to read ${file}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	if (maxLastAppId > 0) {
		console.log(`✅ Found highest app ID: ${maxLastAppId} (from ${maxFile})`);
		return maxLastAppId;
	}

	console.log('📁 No app IDs found in existing files, starting from 0');
	return 0;
}

async function fetchSteamApps(lastAppId: number): Promise<number | null> {
	const baseUrl = process.env.STEAM_API_URL;
	const apiKey = process.env.STEAM_API_KEY;
	if (!baseUrl) throw new Error('Steam API URL not found');
	if (!apiKey) throw new Error('Steam API key not found');

	const url = baseUrl + '/IStoreService/GetAppList/v1/';
	const params = new URLSearchParams({
		key: apiKey,
		include_games: 'true'
	});
	if (lastAppId > 0) {
		params.append('last_appid', lastAppId.toString());
	}

	try {
		const response = await fetch(`${url}?${params.toString()}`);
		if (!response.ok) {
			console.error(`❌ API error: ${response.status} ${response.statusText}`);
			return null;
		}

		const apps = (await response.json()) as ISteamAppListResponse;
		if (!apps.response || !apps.response.apps || !apps.response.apps.length) {
			console.log('ℹ️  No new apps in this batch');
			return null;
		}

		const fileName = `${new Date().getTime()}.json`;
		writeFileSync(`${STEAM_GAMES_DIR}/${fileName}`, JSON.stringify(apps.response), {
			encoding: 'utf-8'
		});

		const appCount = apps.response.apps.length;
		console.log(`✅ Saved ${appCount} apps to ${fileName}`);
		console.log(`   Last app ID: ${apps.response.last_appid}`);

		if (apps.response.have_more_results) {
			return apps.response.last_appid;
		}

		return null;
	} catch (e) {
		console.error(`❌ Failed to fetch apps: ${e instanceof Error ? e.message : String(e)}`);
		return null;
	}
}

async function main() {
	dotenv.config();

	console.log('🚀 Starting Steam Apps Auto-Fetcher...\n');

	let lastAppId = getLastAppIdFromExistingFiles();
	console.log(`📥 Starting from app ID: ${lastAppId}\n`);

	let batchCount = 0;

	while (true) {
		batchCount++;
		console.log(`📦 Fetching batch ${batchCount}...`);

		const nextLastAppId = await fetchSteamApps(lastAppId);

		if (nextLastAppId === null) {
			console.log('\n✨ Fetch complete! No more results from API.');
			break;
		}

		lastAppId = nextLastAppId;

		// Add delay to respect rate limits
		console.log('⏳ Waiting 2 seconds before next batch...\n');
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	console.log(`\n📊 Summary:`);
	console.log(`   Batches fetched: ${batchCount}`);
	console.log(`   Final app ID reached: ${lastAppId}`);
	console.log(`   Steam apps are now up to date!\n`);
}

main().catch((error) => {
	console.error('❌ Fatal error:', error);
	process.exit(1);
});
