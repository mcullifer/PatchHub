import type { ISteamAppListResponseBody } from '$lib/models/Steam';
import { game } from '$lib/server/db/schema';
import { normalizeGameName } from '$lib/util/StringUtils';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function seed(database: ReturnType<typeof drizzle>) {
	const steamGamesDir = 'src/lib/server/db/seeds/data/steam_games';
	try {
		const files = readdirSync(steamGamesDir);
		for (const file of files) {
			const filePath = join(steamGamesDir, file);
			const fileContent = readFileSync(filePath, 'utf-8');
			const jsonData: ISteamAppListResponseBody = JSON.parse(fileContent);
			const gameInserts = jsonData.apps.map((game) => ({
				name: game.name,
				normalizedName: normalizeGameName(game.name),
				externalId: game.appid.toString(),
				provider: 'steam'
			}));
			// insert in batches of 100 or less
			const batchSize = 100;
			for (let i = 0; i < gameInserts.length; i += batchSize) {
				const batch = gameInserts.slice(i, i + batchSize);
				await database.insert(game).values(batch);
			}
		}
		console.log('Bulk insert completed');
	} catch (error) {
		console.error('Error during bulk insert:', error);
	}
}
