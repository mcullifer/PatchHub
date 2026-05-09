# Plan: Software Source Integrations

Status: Active
Owner: Codex
Created: 2026-05-09
Last Updated: 2026-05-09

## Goal

Add first-class software update pages that get the same product treatment as Steam pages: stable source-specific routes, searchable/favoriteable external items, source attribution, cached update feeds, and a dense readable post list with a selected article view.

Start with Windows 11 updates, then make the integration model easy to extend to other software such as browsers, developer tools, drivers, runtimes, and apps that expose RSS, Atom, GitHub releases, vendor APIs, or scrapeable release-history pages.

The home page must also graduate from placeholder software cards to a real scan-friendly software section. It should show trackable software sources, latest-update metadata, source health/freshness, and useful links into the canonical software detail pages.

## Non-Goals

- Do not store full third-party article bodies forever unless a source requires persistence for reliability.
- Do not build a broad crawler or generic web scraper in the first pass.
- Do not use Microsoft Graph Windows Updates API as the primary public source yet; it is aimed at managed Windows Autopatch scenarios and may require tenant/auth context.
- Do not rewrite Steam ingestion or Steam UI unless extracting shared presentation pieces becomes necessary.
- Do not add user-authored software project creation in this plan.

## Current Understanding

- Product behavior:
  - Steam pages at `/steam/[appid]/[[slug]]` have the target interaction pattern: hero/source metadata, post navigation, selected article, source button, and empty/error states.
  - Software currently has a minimal `/software/[name]` route that always loads a Windows 11 feed regardless of `name`.
  - Home software cards currently hard-code Windows 11 and are placeholder-like rather than data-backed.
- Relevant routes/components:
  - `src/routes/steam/[appid]/[[slug]]/+page.svelte`
  - `src/routes/steam/[appid]/[[slug]]/+page.server.ts`
  - `src/routes/software/[name]/+page.svelte`
  - `src/routes/software/[name]/+page.server.ts`
  - `src/lib/components/layout/TopSoftwareSection.svelte`
  - `src/routes/+page.svelte`
  - Candidate shared UI: extract source/update page composition only after the second source proves the shape.
- Relevant services/server modules:
  - `src/lib/server/AtomFeedService.ts` already defines `windows11` as `https://support.microsoft.com/en-us/feed/atom/4ec863cc-2ecd-e187-6cb3-b50c6545db92`.
  - `src/lib/remote/software.remote.ts` already fetches the same feed through a remote query.
  - `src/routes/api/software/mostpopular/+server.ts` duplicates feed fetching through an API route and should eventually be removed or reserved for true HTTP boundaries.
- Relevant data models/schema:
  - `external_item` is already source-scoped enough for software search/favorites with `type`, `externalId`, `slug`, `metadataJson`, `lastNewsCheckedAt`, `lastNewsItemAt`, and `trackStatus`.
  - `external_sync_state` can track source refresh state, cursor, and errors.
  - A separate short-lived cache table may be useful for update lists, but it should store normalized metadata and optional sanitized excerpts, not full mirrored article archives.
- External APIs or integrations:
  - Microsoft Support exposes a Windows 11 Atom feed currently used by the app.
  - Microsoft Learn's Windows 11 release information page is a strong public fallback/index. It lists current versions, release history, availability dates, builds, and KB article links.
  - Microsoft Learn notes that IT administrators can use the Windows Updates API in Microsoft Graph for programmatic release information, but the public Graph docs describe Windows Autopatch deployment/catalog scenarios with enterprise prerequisites.

## Decisions

| Date       | Decision                                                                                                                                  | Reason                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-09 | Treat Windows 11 as the first software source and give it a canonical route like `/software/windows-11` or `/software/windows-11/<slug>`. | The current route is already software-shaped but needs stable source identity rather than loading a hard-coded feed for any name.                    |
| 2026-05-09 | Prefer live fetch with server-side cache for feed entries before persisting full content.                                                 | Third-party patch notes are not PatchHub-owned content, and Windows entries are cumulative public KB/source documents that can be fetched on demand. |
| 2026-05-09 | Store software catalog/source rows in `external_item`, not a new top-level software table in the first pass.                              | Existing favorites/search/source concepts already support external providers and match the Steam direction.                                          |
| 2026-05-09 | Normalize update entries into an internal DTO independent of RSS/Atom parser output.                                                      | Different future sources will return Atom, RSS, GitHub releases, JSON APIs, or HTML pages; UI should not depend on parser-specific classes.          |
| 2026-05-09 | Use Microsoft Support Atom feed as the first Windows 11 source and Microsoft Learn release-history parsing as fallback/enrichment.        | The feed exists and is simple; the Learn page has structured KB/build/release metadata that may be more complete if the feed changes.                |
| 2026-05-09 | Make the home page software section data-backed in the first implementation pass.                                                         | A polished detail route alone would still leave PatchHub's primary discovery surface feeling unfinished.                                             |

## Open Questions

- [ ] Should the canonical Windows route be `/software/windows-11` or a source-specific route like `/windows/windows-11`?
- [ ] Should Windows 11 appear as one source with version filters, or should each supported version such as 24H2, 25H2, and 26H1 be separate child feeds?
- [ ] What cache freshness should be used for Windows updates: 5 minutes, 1 hour, or daily? Monthly Patch Tuesday content does not need aggressive refresh, but out-of-band updates can appear anytime.
- [ ] Should cached entries include full sanitized content, summary/excerpt only, or metadata plus original URL?
- [ ] Should `external_item.type` use `software` with a provider key in metadata, or provider-specific types such as `windows`, `github`, `nvidia`?
- [ ] Should home page software ordering be editorial/manual first, by latest update recency, by popularity/favorites, or a blended ranking?
- [ ] How many software sources should the home page show initially: 3 featured cards, 6 cards like games, or a compact list with one featured source?

## Risks

| Risk                                                         | Impact                                   | Mitigation                                                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft feed URL changes or returns partial content        | Windows 11 page goes empty or stale.     | Keep source configuration in code, persist refresh errors, add fallback parsing from Learn release information, and show stale-cache warnings. |
| Full third-party content storage grows quickly               | DB bloat and unclear content ownership.  | Cache only recent normalized entries with TTL and keep source URLs canonical.                                                                  |
| Atom parser types leak into UI                               | Future sources become harder to add.     | Convert all sources to a `SoftwareUpdateEntry` DTO in server code.                                                                             |
| Different sources use different date semantics               | Sorting and freshness become misleading. | Normalize `publishedAt`, `updatedAt`, and optional `sourceRevisionAt`; show source labels clearly.                                             |
| Scraping Microsoft Learn HTML is brittle                     | Fallback can break silently.             | Treat scraping as fallback/enrichment, cover parser with fixtures, and monitor failures via `external_sync_state`.                             |
| Home page cards overpromise when a source has no recent data | Users land on sparse or broken pages.    | Only show sources with a successful fetch or explicit seeded launch status; include clear empty/failure states.                                |

## Proposed Data Shape

Use `external_item` for the trackable software source:

- `type`: initially `software` or `windows` after the provider-key decision.
- `externalId`: stable source id such as `windows-11`.
- `name`: `Windows 11`.
- `slug`: `windows-11`.
- `metadataJson`: source config metadata such as vendor, icon key, feed URL, support page URL, release-info URL, and available version filters.
- `lastNewsCheckedAt` and `lastNewsItemAt`: source freshness indicators.
- `trackStatus`: `trackable` when source fetch succeeds.

Introduce a cache table only if in-memory/platform HTTP cache is not enough:

- `software_update_cache`
  - `id`
  - `externalItemId`
  - `sourceEntryId`
  - `title`
  - `summary`
  - `contentHtml` nullable
  - `sourceUrl`
  - `publishedAt`
  - `updatedAt`
  - `metadataJson` for KB/build/version/update type
  - `fetchedAt`
  - `expiresAt`

For Windows 11, expected metadata fields:

- `kbId`, such as `KB5083631`
- `build`, such as `26200.8328`
- `windowsVersion`, such as `25H2`
- `updateType`, such as `B`, `D`, or `OOB`
- `servicingChannel`, such as `General Availability Channel`

## Home Page Shape

Replace the current placeholder-like software card with a data-backed `TopSoftwareSection`.

Expected source card content:

- Software/source name, such as `Windows 11`
- Provider/vendor badge, such as `Microsoft`
- Source type badge, such as `Atom feed` or `Release history`
- Latest update title
- Latest update date
- Important metadata when available, such as KB id, build, Windows version, and update type
- Freshness/status indicator:
  - `Updated today`
  - `Updated Apr 30, 2026`
  - `Cached`
  - `Source unavailable`
- Link to canonical detail route
- Favorite control when authenticated, reusing external item favorites

Initial home layout recommendation:

- Keep the same high-level home rhythm: games section first, software section second.
- Show 3 to 6 software cards in a responsive grid.
- For the first pass, show Windows 11 as a real data-backed card and use empty launch-ready slots only if they are real configured sources with clear status. Avoid fake cards that imply unsupported software is already tracked.
- Consider one compact “Add next sources” admin/editorial list later, but do not expose it as product content to normal users.

Possible next software sources after Windows 11:

- .NET releases via Microsoft release feeds/GitHub releases.
- Visual Studio Code via GitHub releases or update API/feed.
- NVIDIA drivers via vendor release pages or RSS if available.
- Chrome/Edge/Firefox via official release blogs/feeds.
- Docker Desktop via release notes feed/GitHub where appropriate.

## Source Strategy

1. RSS/Atom source adapter:
   - Fetch Microsoft Support Atom feed.
   - Parse with `@rowanmanning/feed-parser`.
   - Normalize to `SoftwareUpdateEntry`.
   - Use HTTP cache headers and server-side TTL.

2. Microsoft Learn release-history fallback/enrichment:
   - Fetch `https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information`.
   - Parse release history rows for version, channel, update type, availability date, build, and KB link.
   - Join with feed entries by KB id or source URL when possible.
   - Use fixture tests because this is source-specific parsing.

3. Future source adapters:
   - `atom-feed`
   - `rss-feed`
   - `github-releases`
   - `json-api`
   - `html-release-history`

Each adapter returns the same DTO and source health metadata.

## Implementation Steps

- [x] Define source DTOs:
  - `SoftwareSource`
  - `SoftwareUpdateEntry`
  - `SoftwareSourceHealth`
- [x] Replace `AtomFeeds` with a configurable software source registry that includes Windows 11 feed, support page, Learn release page, display metadata, and cache TTL.
- [x] Add a server-only `SoftwareUpdateService` that fetches, caches, normalizes, sorts, and limits update entries.
- [x] Seed/upsert a Windows 11 `external_item` row so search/favorites can treat it like Steam.
- [x] Decide and implement canonical route resolution for `/software/[slug]`.
- [x] Rework `/software/[name]` load to resolve the source by slug and return normalized source/update DTOs.
- [x] Update `/software/[name]/+page.svelte` to visually match the Steam route pattern: hero, source badges, stats, post list, selected article, source link, empty state, and error state.
- [x] Update `TopSoftwareSection.svelte` to use registered or queried software sources instead of hard-coded one-off data.
- [x] Add a home-page software DTO/query that returns source card summaries with latest update metadata and freshness state.
- [x] Make home software cards link to canonical `/software/[slug]` routes and reuse favorite behavior where possible.
- [x] Add loading, empty, and source-error states for the home software section that match the existing game section density without placeholder content.
- [x] Prefer remote functions for app-internal software data and remove/avoid duplicate API route fetching unless custom cache headers are required.
- [x] Add unit tests for feed normalization.
- [ ] Add Windows release-history parsing with saved fixtures.
- [x] Add a short doc section for adding a new software source.

## Verification

- [ ] `npm run check`
- [ ] `npm run lint`
- [x] `npm run test:unit -- --run`
- [x] HTTP smoke check for `/software/windows-11`.
- [x] HTTP smoke check for `/`.
- [ ] Confirm stale/fetch-failure behavior by mocking or temporarily pointing Windows 11 to a bad feed URL in tests.
- [ ] Confirm source links open Microsoft KB/support URLs and no third-party content is shown without attribution.

## Handoff Notes

- Completed:
  - Read project docs and active plans.
  - Reviewed current Steam route/page pattern.
  - Reviewed current software route, software API route, remote query, `AtomFeedService`, and `external_item` schema.
  - Reviewed current home page composition and confirmed `TopSoftwareSection.svelte` is currently hard-coded/placeholder-like.
  - Verified current Windows 11 source options:
    - Microsoft Support Atom feed exists and is already referenced in code.
    - Microsoft Learn Windows 11 release information page provides current versions and release-history rows.
    - Microsoft Graph Windows Updates API exists but is more enterprise/Autopatch-oriented than needed for the first public source.
  - Added a manual software source registry with Windows 11 as the first source.
  - Added normalized software DTOs and a server-only update service with in-memory TTL caching and stale fallback.
  - Replaced the software API route usage with a Svelte remote query for home-page summaries.
  - Reworked `/software/windows-11` to render normalized updates with source attribution, status, update list, selected article view, and source links.
  - Reworked the home software section to show data-backed source cards.
  - Added unit tests for feed item normalization.
  - Added docs for adding manually curated software sources.
- In progress:
  - Windows release-history fallback/enrichment parsing remains future work.
- Next best step:
  - Add source-specific fallback/enrichment adapters such as Microsoft Learn release-history parsing, then add the next manually curated feed source to validate extensibility.
- Files changed:
  - `.plans/2026-05-09-software-source-integrations.md`
  - `.docs/development-guidelines.md`
  - `src/lib/models/Software.ts`
  - `src/lib/server/software/*`
  - `src/lib/remote/software.remote.ts`
  - `src/lib/components/layout/TopSoftwareSection.svelte`
  - `src/routes/software/[name]/+page.server.ts`
  - `src/routes/software/[name]/+page.svelte`
  - `tests/SoftwareFeedNormalizer.test.ts`
- Known issues:
  - Microsoft Learn release-history fallback/enrichment is not implemented yet.
  - Favorite toggles for software cards are visual only, matching the existing game card behavior.
  - `npm run lint` is blocked by pre-existing unrelated lint errors in `MenuItem.svelte`, `routes/api/games/news/+server.ts`, and `routes/demo/+page.svelte`.
  - `npm run check:types` is blocked by pre-existing unrelated implicit-`any` errors in route handlers.
- Commands already run:
  - `rg --files .docs .plans src`
  - `rg -n "steam|Steam|rss|RSS|feed|patch notes|release notes" src .docs .plans`
  - `sed` reads for project docs, Steam/software routes, services, schema, and plan template.
  - Web checks against Microsoft Support/Learn source pages.
  - `npm run check:svelte`
  - `npm run check:types`
  - `npm run lint:eslint`
  - `npm run test:unit -- --run`
  - `npm run format:check`
  - `npx prettier --write ...`
  - `npm run dev -- --host 127.0.0.1`
  - `curl -I http://127.0.0.1:5173/`
  - `curl -I http://127.0.0.1:5173/software/windows-11`
