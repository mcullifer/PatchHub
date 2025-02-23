import type { ISteamAppListResponseBody } from '$lib/models/Steam';
import { catalog } from '$lib/server/db/schema';
import { normalizeName } from '$lib/util/StringUtils';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function seed(database: ReturnType<typeof drizzle>) {
	await seedSoftware(database);
	await seedGames(database);
}

async function seedSoftware(database: ReturnType<typeof drizzle>) {
	try {
		await database.insert(catalog).values({
			name: 'PatchHub',
			normalizedName: normalizeName('PatchHub'),
			type: 'software',
			createdBy: 'patchhub'
		});
	} catch (e) {
		console.error('Error during software seed:', e);
	}
}

async function seedGames(database: ReturnType<typeof drizzle>) {
	const steamGamesDir = 'src/lib/server/db/seeds/data/steam_games';
	// Some of the steam games have all chinese symbols so the normalized name is blank,
	// so we either need to remove these games or figure out some way to normalize the name.
	try {
		const files = readdirSync(steamGamesDir);
		for (const file of files) {
			const filePath = join(steamGamesDir, file);
			const fileContent = readFileSync(filePath, 'utf-8');
			const jsonData: ISteamAppListResponseBody = JSON.parse(fileContent);
			const gameInserts = jsonData.apps.map((game) => ({
				name: game.name,
				normalizedName: normalizeName(game.name),
				type: 'game',
				createdBy: 'steam',
				externalId: game.appid.toString()
			}));
			// insert in batches of 100 or less
			const batchSize = 100;
			for (let i = 0; i < gameInserts.length; i += batchSize) {
				const batch = gameInserts.slice(i, i + batchSize);
				await database.insert(catalog).values(batch);
			}
		}
		console.log('Bulk insert completed');
	} catch (e) {
		console.error('Error during bulk insert:', e);
	}
}
