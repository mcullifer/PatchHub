import type { ISteamAppListResponseBody } from '$lib/models/Steam';
import { externalItem } from '$lib/server/db/schema';
import { createSteamExternalItemValues } from '$lib/server/steam/SteamCatalog';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function seed(database: ReturnType<typeof drizzle>, targetFile?: string) {
	await seedSteamGames(database, targetFile);
}

async function seedSteamGames(database: ReturnType<typeof drizzle>, targetFile?: string) {
	const steamGamesDir = 'src/lib/server/db/seeds/data/steam_games';
	const skippedGames: Array<{ name: string; externalId: string; reason: string }> = [];
	let successCount = 0;
	const batchSize = 100;

	try {
		let files = readdirSync(steamGamesDir).filter((file) => file.endsWith('.json'));

		// Filter files if targetFile is specified
		if (targetFile) {
			if (!files.includes(targetFile)) {
				console.error(`❌ File not found: ${targetFile}`);
				console.log(`Available files: ${files.join(', ')}`);
				return;
			}
			files = [targetFile];
		}

		for (const file of files) {
			const filePath = join(steamGamesDir, file);
			const fileContent = readFileSync(filePath, 'utf-8');
			const jsonData: ISteamAppListResponseBody = JSON.parse(fileContent);

			// Prepare all game inserts for this file
			const gameInserts = jsonData.apps.map((game) => ({
				game,
				data: createSteamExternalItemValues(game)
			}));

			// Process in batches
			for (let i = 0; i < gameInserts.length; i += batchSize) {
				const batch = gameInserts.slice(i, i + batchSize);

				try {
					// Try batch insert first (fastest)
					for (const { data } of batch) {
						await database
							.insert(externalItem)
							.values(data)
							.onConflictDoUpdate({
								target: [externalItem.type, externalItem.externalId],
								set: {
									name: data.name,
									normalizedName: data.normalizedName,
									source: data.source,
									appType: data.appType,
									slug: data.slug,
									searchName: data.searchName,
									isSearchable: data.isSearchable,
									trackStatus: data.trackStatus,
									metadataJson: data.metadataJson,
									lastSeenAt: data.lastSeenAt,
									lastSyncedAt: data.lastSyncedAt,
									updatedAt: data.updatedAt
								}
							});
					}
					successCount += batch.length;
				} catch {
					// Batch failed, fall back to individual inserts for this batch only
					for (const { game, data } of batch) {
						try {
							await database
								.insert(externalItem)
								.values(data)
								.onConflictDoUpdate({
									target: [externalItem.type, externalItem.externalId],
									set: {
										name: data.name,
										normalizedName: data.normalizedName,
										source: data.source,
										appType: data.appType,
										slug: data.slug,
										searchName: data.searchName,
										isSearchable: data.isSearchable,
										trackStatus: data.trackStatus,
										metadataJson: data.metadataJson,
										lastSeenAt: data.lastSeenAt,
										lastSyncedAt: data.lastSyncedAt,
										updatedAt: data.updatedAt
									}
								});
							successCount++;
						} catch (individualError) {
							const errorMessage =
								individualError instanceof Error
									? individualError.message
									: String(individualError);
							skippedGames.push({
								name: game.name,
								externalId: data.externalId,
								reason: errorMessage
							});
						}
					}
				}
			}
		}

		console.log(`\n✅ Steam games insert completed: ${successCount} games inserted successfully`);

		if (skippedGames.length > 0) {
			console.log(`\n⚠️  Skipped ${skippedGames.length} games:\n`);
			skippedGames.forEach((game, index) => {
				console.log(`${index + 1}. "${game.name}" (external id: "${game.externalId}")`);
				console.log(`   Reason: ${game.reason}\n`);
			});
		}
	} catch (e) {
		console.error('Error during Steam games bulk insert:', e);
	}
}
