import type { ISteamAppListItem } from '$lib/models/Steam';
import * as schema from '$lib/server/db/schema';
import {
	importSteamAppListPage,
	markSteamAppListSyncStarted,
	type SteamCatalogDatabase
} from '$lib/server/steam/SteamCatalogRepository';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { describe, expect, it } from 'vitest';

describe('SteamCatalogRepository.importSteamAppListPage', () => {
	it('imports apps and advances the cursor in one successful transaction', async () => {
		const { database, sqlite } = createTestDatabase();

		await markSteamAppListSyncStarted(10, database);
		const importedCount = await importSteamAppListPage(
			{
				apps: [createApp(25, 'Cursor Game')],
				cursor: 25,
				status: 'partial',
				batchSize: 1,
				now: new Date('2026-06-15T00:00:00.000Z')
			},
			database
		);

		const syncState = sqlite
			.prepare('select last_app_id, status from steam_catalog_sync_state where id = ?')
			.get(1) as { last_app_id: string; status: string };
		const item = sqlite
			.prepare('select external_id, name from external_item where type = ? and external_id = ?')
			.get('steam', '25') as { external_id: string; name: string };

		expect(importedCount).toBe(1);
		expect(syncState).toEqual({ last_app_id: '25', status: 'partial' });
		expect(item).toEqual({ external_id: '25', name: 'Cursor Game' });

		sqlite.close();
	});

	it('preserves the prior cursor when the app import transaction fails', async () => {
		const { database, sqlite } = createTestDatabase();

		await markSteamAppListSyncStarted(10, database);
		sqlite.exec(`
			create trigger fail_external_item_insert
			before insert on external_item
			begin
				select raise(abort, 'forced insert failure');
			end;
		`);

		await expect(
			importSteamAppListPage(
				{
					apps: [createApp(25, 'Cursor Game')],
					cursor: 25,
					status: 'partial',
					batchSize: 1,
					now: new Date('2026-06-15T00:00:00.000Z')
				},
				database
			)
		).rejects.toThrow('forced insert failure');

		const syncState = sqlite
			.prepare('select last_app_id, status from steam_catalog_sync_state where id = ?')
			.get(1) as { last_app_id: string; status: string };

		expect(syncState).toEqual({ last_app_id: '10', status: 'running' });

		sqlite.close();
	});
});

function createApp(appid: number, name: string): ISteamAppListItem {
	return {
		appid,
		name,
		last_modified: 123,
		price_change_number: 456
	};
}

function createTestDatabase() {
	const sqlite = new Database(':memory:');
	sqlite.exec(`
		create table external_item (
			id integer primary key autoincrement,
			name text not null,
			normalized_name text not null,
			type text not null,
			external_id text,
			source text,
			app_type text not null default 'unknown',
			slug text not null default '',
			search_name text not null default '',
			metadata_json text,
			created_at integer not null,
			updated_at integer not null
		);

		create unique index external_item_source_external_id_idx
			on external_item(type, external_id);

		create unique index external_item_source_slug_external_id_idx
			on external_item(type, slug, external_id);

		create table steam_catalog_sync_state (
			id integer primary key,
			last_app_id text,
			status text not null default 'idle',
			last_error text,
			created_at integer not null,
			updated_at integer not null
		);
	`);

	const database = drizzle(sqlite, { schema }) as SteamCatalogDatabase;
	return { database, sqlite };
}
