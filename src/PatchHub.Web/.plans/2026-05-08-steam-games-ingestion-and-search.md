# Plan: Steam Games Ingestion and Search

Status: Active
Owner: Codex
Created: 2026-05-08
Last Updated: 2026-05-08

## Goal

Make Steam games reliable as PatchHub's first large external data source. Users should be able to search for Steam games, open a stable game page, and see Steam announcement/news updates without missing newly released games or breaking on non-Latin titles.

This should also establish the pattern for later external sources such as RSS feeds, software release feeds, GitHub releases, and direct PatchHub projects.

Steam search should prefer actual games and trackable apps that produce useful update/news content. DLC, soundtracks, trailers, tools, demos, and other app types should not appear in primary search unless there is a deliberate reason to track them.

## Non-Goals

- Do not build user-created organization/project posting flows yet.
- Do not build a full generic external-source admin UI yet.
- Do not depend on a SvelteKit request handler running a long ingestion loop during normal user traffic.
- Do not try to infer private Steam publisher data; only use public or appropriately keyed APIs.
- Do not treat every Steam app id as a searchable PatchHub title.

## Current Understanding

- Steam app ingestion scripts:
  - `scripts/updateSteamApps.ts`
  - `scripts/updateSteamAppsAuto.ts`
- Steam API wrapper:
  - `src/lib/server/apis/steam.ts`
- Steam search and DB lookup:
  - `src/lib/server/SteamGameService.ts`
  - `src/routes/api/games/search/+server.ts`
  - `src/lib/remote/games.remote.ts`
  - `src/lib/components/common-ui/NavbarSearch.svelte`
- Steam pages/news:
  - `src/routes/game/[id]/+page.server.ts`
  - `src/routes/game/[id]/+page.svelte`
  - `src/routes/[createdBy]/[project]/+page.server.ts`
  - `src/routes/[createdBy]/[project]/+page.svelte`
- DB schema:
  - `src/lib/server/db/schema.ts`
  - `externalItem` currently stores external source rows for Steam and future providers.
- Seed import:
  - `src/lib/server/db/seed.ts`
  - `src/lib/server/db/seeds/external_item.ts`

## Findings

- Steam's old public `ISteamApps/GetAppList/v2` endpoint is now documented as deprecated because it no longer scales. Steam recommends `IStoreService/GetAppList` instead.
- The current scripts already call `IStoreService/GetAppList/v1`, which is the right API family.
- The scripts write JSON files under `src/lib/server/db/seeds/data/steam_games`, but the app searches SQLite through `externalItem`. Updating JSON files alone does not update the searchable DB unless `db:seed` imports them.
- `scripts/updateSteamApps.ts` starts from a hard-coded `lastAppId` of `4121970`, which can skip anything below that id or anything missed before that checkpoint.
- `scripts/updateSteamAppsAuto.ts` resumes from the highest `last_appid` found in saved JSON files, not from ingestion state in the database. This makes it hard to know whether a fetched page was actually imported.
- `include_games=true` on `IStoreService/GetAppList` helps, but it should not be the only quality filter. Steam app lists can still contain entries that are not useful PatchHub targets, and some returned apps may not publish announcement/news items.
- `externalItem.normalizedName` has a global unique index. That can cause different Steam apps or future providers with the same normalized name to collide.
- `externalItem.externalId` has a global unique index. That prevents two different sources from using the same external id value, even though ids are only meaningful inside a source.
- `normalizeName` strips every character except ASCII letters, digits, and spaces. Chinese, Japanese, Korean, Cyrillic, accented, and symbol-heavy names can become empty, lossy, or collide.
- `seedSteamGames` skips rows when `normalizedName` is empty. This explains weird behavior with Chinese-character Steam app names.
- Search uses `LIKE` against `externalItem.name`, not `normalizedName`, full-text search, or a dedicated search table.
- External Steam detail routes currently resolve by `normalizedName` in the URL. That is brittle for non-Latin names and duplicate names.
- Several route handlers are missing generated SvelteKit request types, which currently shows up in `npm run check:svelte` and `npm run check:types`.

## Decisions

| Date       | Decision                                                                                                      | Reason                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-05-08 | Use `IStoreService/GetAppList` as the primary Steam app list source.                                          | Steam documents the older `ISteamApps/GetAppList` endpoint as deprecated.                                             |
| 2026-05-08 | Treat ingestion as a server-side scheduled job or script, not page-load work.                                 | A full Steam sync can be long-running, rate-limited, and should not depend on user traffic.                           |
| 2026-05-08 | Store ingestion checkpoint state in the DB, not only in generated JSON seed files.                            | Checkpoints need to reflect successfully imported data, not merely fetched files.                                     |
| 2026-05-08 | Use source-scoped unique constraints, such as `(source, externalId)`, instead of global external id/name ids. | External ids and names are only unique within a source and sometimes are not unique even within a source.             |
| 2026-05-08 | Do not use normalized names as stable external item identifiers.                                              | Non-Latin titles and duplicate game names make normalized name routes unreliable.                                     |
| 2026-05-08 | Separate raw Steam app discovery from PatchHub-searchable/trackable Steam titles.                             | Steam exposes many app ids that are not games or do not have useful patch notes.                                      |
| 2026-05-08 | Keep the existing `external_item.type = 'steam'` provider key while adding source-scoped uniqueness fields.   | Current routes and favorites already use `type` as the source key; provider-specific app kind now lives in `appType`. |

## Implementation Progress

- [x] Added source-scoped unique indexes for Steam external ids and route helper slugs.
- [x] Added `external_sync_state` for DB-backed sync cursors and sync status.
- [x] Added Unicode-safe `searchName` and slug generation while preserving original Steam names.
- [x] Added a server-only Steam ingestion service that upserts app list pages and records checkpoints.
- [x] Reworked `scripts/updateSteamApps.ts` and `scripts/updateSteamAppsAuto.ts` to call the shared ingestion service.
- [x] Updated Steam seed import to use the same external item normalization/upsert path and ignore non-JSON seed files.
- [x] Updated Steam search to query both original names and Unicode-safe search names.
- [x] Updated local `local.db` schema with `npm run db:push -- --force`.
- [x] Reseeded local Steam data and ran one live Steam sync page.

## Verification Notes

- `npm run test:unit -- --run tests/UtilTests.test.ts` passed.
- Focused ESLint on changed implementation files passed.
- Svelte autofixer was run on `NavbarSearch.svelte`; it reported no issues, only optional `bind:this` suggestions.
- `npm run db:seed` imported 162,115 Steam apps into the new local schema.
- `npm run steam:sync -- --pages=1 --classify=0` imported/upserted 10,000 apps and stored `external_sync_state.cursor = 507380`.
- SQLite spot check confirmed Unicode search names/slugs for non-Latin Steam titles.
- `npm run check:types` is still blocked by pre-existing generated-route-type and old favorites API schema errors outside this implementation.

## Open Questions

- [ ] What deployment target will run PatchHub in production: Node server, Docker, Vercel-like serverless, Fly.io, VPS, or something else?
- [ ] Should Steam sync require a Steam API key in every environment, or should local/dev allow importing from committed fixture files?
- [ ] What is the exact definition of a searchable Steam title for PatchHub: Steam type `game`, has Steam community announcements, has recent news, manually allowlisted, or some combination?
- [ ] Should PatchHub eventually expose external items under `/steam/<appid>/<slug>` or keep `/game/<appid>` as the canonical route?
- [ ] Should external Steam news be stored/cached in the DB, or fetched live with HTTP caching for now?
- [ ] Should non-game apps with release notes, such as developer tools or software, appear in a separate "Software" search category later?

## Risks

| Risk                                          | Impact                                                        | Mitigation                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Steam API pagination misses or reorders apps  | New titles may not appear in search.                          | Persist sync state, support full resyncs, and upsert by `(source, externalId)`.             |
| Steam app list contains non-game/no-news apps | Search gets cluttered with DLC, tools, demos, and dead pages. | Store raw discovery state separately from searchable status and apply trackability filters. |
| API rate limits or failures                   | Scheduled sync may fail partway through.                      | Use retries, delay/backoff, checkpoint only after successful import, and log sync attempts. |
| Non-Latin and duplicate names                 | Search and external routes become unreliable.                 | Preserve original names, use source ids in URLs, and use Unicode-aware search fields.       |
| SQLite search limitations                     | Search quality may be poor for multilingual titles.           | Start with source/id-safe schema; evaluate SQLite FTS5 with unicode tokenizer later.        |
| Schema migration churn                        | Existing local data may need reset or migration.              | Make migration explicit and document local DB reset steps if needed.                        |
| Long-running sync inside SvelteKit            | User requests could time out or duplicate sync work.          | Put sync in CLI/cron/job path, with optional secured endpoint trigger.                      |

## Recommended Architecture

### Source Model

Keep user-created PatchHub projects separate from external catalog items.

Recommended external tables:

- `external_source`
  - `id`
  - `key`, such as `steam`
  - `name`
  - `baseUrl`
  - timestamps
- `external_item`
  - `id`
  - `sourceId`
  - `externalId`
  - `type`, such as `game`, `software`, `dlc`, `demo`, or `unknown`
  - `name`
  - `slug`
  - `searchName`
  - `isSearchable`
  - `trackStatus`, such as `candidate`, `trackable`, `not_trackable`, `needs_review`
  - `lastNewsCheckedAt`
  - `lastNewsItemAt`
  - `metadataJson`
  - `firstSeenAt`
  - `lastSeenAt`
  - `lastSyncedAt`
  - timestamps
- `external_sync_state`
  - `id`
  - `sourceId`
  - `syncKind`, such as `steam-app-list`
  - `cursor`
  - `status`
  - `startedAt`
  - `finishedAt`
  - `lastError`

Use unique indexes on:

- `external_source.key`
- `external_item(sourceId, externalId)`
- optionally `external_item(sourceId, slug, externalId)` for route helpers
- `external_sync_state(sourceId, syncKind)`

Do not use global uniqueness for `normalizedName` or `externalId`.

### Steam Filtering

Use a two-stage ingestion model:

1. Discovery imports Steam apps from `IStoreService/GetAppList` into the DB with raw source metadata.
2. Classification decides whether each app should be searchable/trackable by PatchHub.

Initial classification rules:

- Include apps returned by `IStoreService/GetAppList` with `include_games=true` as `candidate`.
- Exclude obvious non-target titles by name pattern only as a low-confidence cleanup, not as identity logic:
  - DLC
  - Soundtrack
  - Demo
  - Dedicated Server
  - Tool
  - Trailer
  - Artbook
  - Bonus Content
- Promote an app to `trackable` when Steam news/announcements return useful items from `ISteamNews/GetNewsForApp`.
- Keep apps with no news as `candidate` or `not_trackable` depending on how old they are and whether they ever produce announcements.
- Allow manual overrides later so popular edge cases can be included or excluded.

Important: do not delete discovered Steam apps just because they are not searchable. Mark them with status fields so classification can improve without needing a full rediscovery.

Recommended search behavior:

- Primary search returns `isSearchable = true` and `trackStatus = 'trackable'`.
- Optional admin/debug search can include candidates and excluded apps.
- Popular games should still be hydrated by app id; if a popular app is missing from the DB, queue it for classification instead of silently dropping it forever.

### Steam Sync

Build a server-only ingestion module, for example:

- `src/lib/server/steam/SteamAppListClient.ts`
- `src/lib/server/steam/SteamAppIngestionService.ts`

Then expose it through one or more controlled entry points:

- CLI script: `npm run steam:sync`
- Production scheduler/cron command: same CLI command
- Optional secured admin endpoint: `POST /api/admin/sync/steam-apps`

The CLI and endpoint should both call the same server service.

Sync behavior:

1. Read Steam sync cursor from `external_sync_state`.
2. Fetch one page from `IStoreService/GetAppList`.
3. Validate the response shape.
4. Upsert apps into `external_item` by `(sourceId, externalId)`.
5. Store original name exactly as Steam returns it.
6. Store a Unicode-safe slug only for display URLs, not as identity.
7. Set new apps to `trackStatus = 'candidate'` and `isSearchable = false` until classified.
8. Run classification for new or stale candidate apps in a rate-limited batch.
9. Promote apps with useful Steam news/announcements to `trackable` and `isSearchable = true`.
10. Update `lastSeenAt` and `lastSyncedAt`.
11. Advance cursor only after the DB transaction succeeds.
12. Repeat until `have_more_results` is false or a configured batch limit is reached.
13. Record sync result and errors in `external_sync_state`.

### Search

Short-term:

- Search by original `name` with parameterized `LIKE`.
- Add `searchName` generated with Unicode-aware normalization:
  - `name.normalize('NFKC')`
  - trim
  - lowercase with locale-neutral casing
  - preserve letters/numbers from all scripts
  - remove only control characters and unsafe punctuation
- Query both `name` and `searchName`.
- Return stable route ids using `source` and `externalId`.

Medium-term:

- Add SQLite FTS5 for `external_item_search` if better ranking is needed.
- Include aliases and alternate localized names when a source provides them.
- Rank exact prefix matches higher than substring matches.

### Routes

Prefer stable external routes:

- Canonical Steam game page: `/game/[appid]`
- Optional nice URL later: `/steam/[appid]/[slug]`

Avoid using only normalized names for external items. They are not unique, and they break for non-Latin titles.

For user-created PatchHub projects, keep owner/project slug routes:

- `/[createdBy]/[project]`

If an external item needs to look GitHub-like, use source plus external id:

- `/steam/[appid]`
- `/external/[source]/[externalId]`

## Implementation Steps

- [ ] Confirm deployment target and scheduler option.
- [ ] Audit current local DB contents for Steam rows, duplicate names, duplicate normalized names, and missing app ids.
- [ ] Write a DB migration for source-scoped external items and sync state.
- [ ] Replace global unique indexes on `normalizedName` and `externalId`.
- [ ] Add `isSearchable`, `trackStatus`, `lastNewsCheckedAt`, and `lastNewsItemAt` fields for external items.
- [ ] Add Unicode-safe `searchName` and route-safe `slug` helpers.
- [ ] Add unit tests for names with Chinese, Japanese, accented Latin, punctuation, emoji, empty names, and duplicate names.
- [ ] Create `SteamAppListClient` for `IStoreService/GetAppList`.
- [ ] Create `SteamNewsClient` or extend the current Steam API wrapper for classification checks.
- [ ] Create `SteamAppIngestionService` with transactions, upserts, checkpointing, and batch limits.
- [ ] Create `SteamAppClassificationService` to mark candidates as trackable/not-trackable/searchable.
- [ ] Replace JSON-file-only sync scripts with a CLI command that imports directly into the DB.
- [ ] Keep fixture-based import only for tests/local seed data.
- [ ] Update `package.json` scripts with `steam:sync` and possibly `steam:sync:once`.
- [ ] Update search service to use source-scoped external items and Unicode-safe search fields.
- [ ] Update search results to route to `/game/[appid]` or the chosen canonical Steam route.
- [ ] Update external item detail routes to stop resolving Steam games by `normalizedName`.
- [ ] Add admin/cron trigger only if deployment needs HTTP-triggered sync.
- [ ] Document Steam sync operation in `.docs/steam-ingestion.md`.

## Verification

- [ ] `npm run check:svelte`
- [ ] `npm run check:types`
- [ ] `npm run lint:eslint`
- [ ] `npm run test:unit -- --run`
- [ ] Unit tests for Unicode normalization/search helpers.
- [ ] Unit tests for Steam ingestion pagination and checkpoint behavior with mocked responses.
- [ ] Unit tests for Steam classification rules, including DLC/demo/soundtrack/tool names and apps with/without news.
- [ ] Integration check that a known Steam app id can be upserted and found by id.
- [ ] Manual browser check for search and Steam game detail pages.
- [ ] Verify a Chinese-character Steam title can be inserted, searched, and opened.
- [ ] Verify duplicate display names do not collide.

## Handoff Notes

- Completed:
  - Reviewed current scripts, schema, services, search route, Steam pages, and official Steam API docs.
  - Identified likely causes of missing/odd Steam behavior:
    - JSON fetch files are separate from DB ingestion.
    - Cursor state is file-based and not tied to successful DB import.
    - Hard-coded `lastAppId` exists in one script.
    - ASCII-only normalization skips or corrupts non-Latin names.
    - Global unique indexes are too strict for external sources.
    - Steam app discovery needs a separate classification step so DLC/software/no-news apps do not clutter primary search.
- In progress:
  - No implementation changes have been made yet beyond this plan.
- Next best step:
  - Decide deployment/scheduler target, then implement DB-backed Steam sync service and schema migration.
- Files changed:
  - `.plans/2026-05-08-steam-games-ingestion-and-search.md`
- Known issues:
  - `npm run check:svelte` and `npm run check:types` currently report pre-existing route/schema/type errors.
  - Current favorite API routes reference old schema names (`catalog`, `favorite`) that no longer exist.
  - Current generated route types are missing from several handlers.
- Commands already run:
  - Read Steam scripts, schema, seed, services, search routes, and pages.
  - Checked official Steam docs for app list endpoint guidance.
