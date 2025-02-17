import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ISteamAppListItem, ISteamAppListResponseBody } from '../src/lib/models/Steam';
import { game } from '../src/lib/server/db/schema';

dotenv.config();
const db_url = process.env.DATABASE_URL;
if (!db_url) throw new Error('DATABASE_URL is not set');
const client = new Database(db_url);
const db = drizzle(client);

const steamGamesDir = join(process.cwd(), 'src/lib/server/steam_games');

async function bulkInsertSteamGames() {
	try {
		const files = readdirSync(steamGamesDir);
		for (const file of files) {
			const steamGames: ISteamAppListItem[] = [];
			const filePath = join(steamGamesDir, file);
			const fileContent = readFileSync(filePath, 'utf-8');
			const jsonData: ISteamAppListResponseBody = JSON.parse(fileContent);
			steamGames.push(...jsonData.apps);

			const gameInserts = steamGames.map((game) => ({
				name: game.name,
				externalId: game.appid.toString(),
				provider: 'steam'
			}));

			await db.insert(game).values(gameInserts);
		}
		console.log('Bulk insert completed');
	} catch (error) {
		console.error('Error during bulk insert:', error);
	}
}

bulkInsertSteamGames().catch(console.error);
