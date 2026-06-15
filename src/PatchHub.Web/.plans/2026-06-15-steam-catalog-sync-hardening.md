# Plan: Steam Catalog Incremental Sync

Status: In Progress
Owner: Codex
Created: 2026-06-15
Last Updated: 2026-06-15

## Goal

Provide one command that fetches Steam game apps newer than the last stored Steam app-list cursor,
maps them into PatchHub's `external_item` catalog/search table, inserts or updates them, and then
saves Steam's returned cursor.

The command is:

```bash
npm run steam:sync
```

## Non-Goals

- Do not call per-app Steam endpoints while syncing the catalog.
- Do not call Steam news while syncing the catalog.
- Do not add generic lifecycle/status fields to `external_item`.
- Do not preserve old script aliases.
- Do not build scheduler/cron wiring in this pass.

## Current Shape

- `scripts/syncSteamCatalog.ts` is the only command entry point.
- `src/lib/server/steam/SteamApiClient.ts` calls Steam APIs and validates response shape.
- `src/lib/server/steam/SteamCatalogMapper.ts` maps Steam app-list rows into DB values.
- `src/lib/server/steam/SteamCatalogRepository.ts` owns Steam catalog DB reads/writes.
- `src/lib/server/steam/SteamCatalogSync.ts` orchestrates cursor reads, API page fetches,
  transactional imports, and cursor updates.

## Sync Behavior

1. Read the stored `last_app_id` cursor from `steam_catalog_sync_state`.
2. Call `IStoreService/GetAppList` with that cursor and `include_games=true`.
3. Validate the Steam response. Throw on HTTP, network, or malformed app rows.
4. Map returned apps into `external_item` values.
5. Upsert apps in DB batches inside the same transaction that advances the cursor.
6. Repeat until Steam returns `have_more_results = false`; if Steam omits pagination fields on
   the final page, treat that page as final and derive the cursor from the last returned appid.
7. If `--pages=N` is provided, stop after that many pages and leave sync status as partial when
   Steam still has more results.

## Completed

- Replaced old Steam service/API/script files with functional modules under `src/lib/server/steam`.
- Removed `get-latest-steam-apps` and `get-steam-apps-auto`.
- Kept `npm run steam:sync` as the only command.
- Removed sync-time news probing/filtering.
- Simplified `external_item` back to catalog/search fields plus source metadata.
- Replaced the generic sync state table with `steam_catalog_sync_state`.
- Reset and reseeded the local `external_item` table.
- Ran `npm run steam:sync`; it imported through Steam appid `4843820` and marked sync complete.
- Reset `local.db` from the current schema and restored the synced Steam catalog/cursor.
- Removed Drizzle-managed DB foreign keys/checks/project slug indexes that made SQLite `db:push`
  non-idempotent.
- Added tests for API failure semantics and cursor advancement behavior.
- Added a regression test for Steam final pages that omit pagination fields.
- Added a regression test for Steam's empty current response shape, `{"response":{}}`.

## Validation

- `npm run db:push` now reports no changes.
- `npm run db:seed` passed after resetting `external_item`.
- `npm run steam:sync` passed and marked sync complete at Steam appid `4843820`.
- Focused Steam tests passed:
  `npm run test:unit -- --run tests/SteamApiClient.test.ts tests/SteamCatalogSync.test.ts tests/SteamCatalogRepository.test.ts`.
- `npm run validate` passed.
