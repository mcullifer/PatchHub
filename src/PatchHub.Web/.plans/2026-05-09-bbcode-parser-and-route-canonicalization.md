# Plan: Reliable BBCode Rendering and Canonical External Routes

Status: Implemented
Owner: Codex
Created: 2026-05-09
Last Updated: 2026-05-09

## Goal

Make Steam patch note pages render consistently and safely by replacing the fragile BBCode conversion path with a deterministic Steam-oriented BBCode parser that emits sanitized HTML-ready markup, then route every Steam game entry point to one canonical external item page.

Users should be able to open a Steam game from search, popular cards, or a direct URL and see the same page, same selected article behavior, and the same BBCode rendering.

## Non-Goals

- Do not build a full WYSIWYG editor or editing workflow for external Steam posts.
- Do not preserve the current legacy `/game/[id]` and `/software/[name]` route behavior.
- Do not add compatibility redirects unless they make local development easier during the migration.
- Do not trust Steam HTML or BBCode output without sanitization.
- Do not attempt to support every forum BBCode dialect at once. Start with the Steam announcement/news dialect and unknown-tag fallbacks.

## Current Findings

- Steam news rendering currently happens on the client in two different route trees:
  - `src/routes/game/[id]/+page.svelte`
  - `src/routes/[createdBy]/[project]/+page.svelte`
- Search results route to `/game/:appid` through `NavbarSearch.svelte`.
- Popular Steam cards route to `/{source}/{normalizedName}` and sometimes add `?e=true` through `GameCard.svelte`.
- The `[createdBy]/[project]` route resolves external Steam items by `normalizedName`, which is brittle for non-Latin titles and duplicate names.
- The old `/game/[id]` route resolves by Steam app id, which is more stable, but it is separated from the newer GitHub-like route model.
- Current BBCode parsing lives in:
  - `src/lib/services/BBCodeParser.ts`
  - `src/lib/services/BBCodeService.ts`
  - `tests/BBCodeParser.test.ts`
- The existing parser has many tests, but its architecture is fragile:
  - It mixes tokenization, recursive conversion, HTML construction, escaping, Steam-specific media transforms, and error recovery.
  - It generates HTML attributes by string interpolation.
  - It handles malformed or unmatched tags inconsistently.
  - It mutates `news.newsitems[i].contents` in Svelte pages.
  - It has no fixture corpus from real Steam announcement payloads.
- The `[createdBy]/[project]` page currently sanitizes parsed BBCode and passes it into `TipTap`, while `/game/[id]` sanitizes and renders with `{@html}`. This creates different output for the same Steam post.
- `TipTap` is still the right direction for user-authored PatchHub patch notes and future editing flows. The concern is only using an editor component as the display renderer for external provider content.

## Decisions

| Date       | Decision                                                                                                   | Reason                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 2026-05-09 | Build a Steam-focused BBCode parser as a small AST parser plus renderer, not a regex/string-rewrite layer. | Steam posts contain nested tags, malformed tags, media tags, and list/table structures that need state. |
| 2026-05-09 | Parser output should be HTML strings intended for DOMPurify sanitization at render boundaries.             | The UI already uses DOMPurify and this keeps provider parsing separate from sanitization policy.        |
| 2026-05-09 | Unknown or malformed tags should degrade to escaped text by default.                                       | Broken third-party posts should not break the page or create unsafe HTML.                               |
| 2026-05-09 | Canonical Steam external URLs should include source and external id, not normalized display names.         | App id is stable; names are not stable, unique, or ASCII-safe.                                          |
| 2026-05-09 | Search and popular cards should use the same canonical route.                                              | One source page means one rendering path and fewer regressions.                                         |
| 2026-05-09 | Remove legacy unpublished routes instead of maintaining compatibility layers.                              | PatchHub is greenfield and has no public URL contract yet.                                              |

## Proposed Canonical Routes

Preferred target:

- `/steam/:appid/:slug?`

Examples:

- `/steam/32400/star-wars-dark-forces-classic-1995`
- `/steam/1245620/elden-ring`

Route cleanup:

- Delete or replace `/game/[id]` after search links move to `/steam/:appid/:slug`.
- Remove the `?e=true` external-item mode from `/:createdBy/:project`.
- Keep `/:createdBy/:project` only for user/org-authored PatchHub projects.
- Replace `/software/[name]` with the same external source route pattern when software sources become real catalog items.

## BBCode Parser Architecture

### Modules

Create or replace with a clearer split:

- `src/lib/services/bbcode/BBCodeTokenizer.ts`
- `src/lib/services/bbcode/BBCodeParser.ts`
- `src/lib/services/bbcode/BBCodeRenderer.ts`
- `src/lib/services/bbcode/SteamBBCode.ts`
- `src/lib/services/BBCodeService.ts` as the public facade

### Pipeline

1. Normalize line endings to `\n`.
2. Tokenize into text and tag tokens with source positions.
3. Parse tokens into a simple AST:
   - `Document`
   - `Text`
   - `Element`
   - `SoftBreak`
   - `HardBreak`
4. Use a permissive recovery mode:
   - known tag with closing tag: nested element
   - known self-closing tag: element without children
   - unknown tag: escaped literal text
   - mismatched closing tag: escaped literal text or close nearest matching parent only when safe
   - unclosed formatting tag: render its children and close the HTML element
   - unclosed structural/media tag: degrade conservatively
5. Render AST to HTML with escaped text and escaped attributes.
6. Sanitize rendered HTML with DOMPurify at the Svelte render boundary.

### Supported Steam Tags

Initial high-confidence tags:

- Inline: `[b]`, `[i]`, `[u]`, `[s]`, `[strike]`
- Structure: `[h1]` through `[h6]`, `[quote]`, `[code]`, `[hr]`
- Lists: `[list]`, `[olist]`, `[*]`
- Links: `[url]`, `[url=...]`
- Images: `[img]...[/img]`, Steam `{STEAM_CLAN_IMAGE}` placeholder
- Steam media: `[previewyoutube=...]`, `[video ...]`
- Tables: `[table]`, `[tr]`, `[td]`, `[th]`
- Spoilers: `[spoiler]`

Questionable tags requiring strict validation:

- `[color=...]` should allow only safe named colors, hex colors, or CSS custom classes.
- `[size=...]` should map to a bounded class or known size scale, not arbitrary style text.
- Raw `style` attributes should not be emitted.

## Test Strategy

Keep the existing unit tests, but reorganize and harden them around behavior instead of implementation details.

Add fixture-driven tests:

- `tests/fixtures/steam-bbcode/simple-formatting.txt`
- `tests/fixtures/steam-bbcode/lists-and-headings.txt`
- `tests/fixtures/steam-bbcode/media-and-clan-images.txt`
- `tests/fixtures/steam-bbcode/malformed-tags.txt`
- `tests/fixtures/steam-bbcode/real-steam-announcement-*.txt`

Core test cases:

- nested formatting tags
- adjacent tags without whitespace
- malformed tags that should remain visible as text
- unmatched closing tags
- unclosed inline tags
- nested lists and list items without explicit closing tags
- URLs with query strings and quotes
- invalid URLs rejected or rendered as text
- image URLs with Steam clan placeholder
- media tags generate safe links/previews
- text HTML is escaped before sanitization
- renderer never emits `script`, inline event handlers, or `javascript:` URLs

Add snapshot-style tests only for real Steam fixtures after the renderer stabilizes. Prefer direct HTML assertions for small cases.

## UI and Route Work

1. Create a reusable Steam patch notes page component or route-local composition that takes:
   - external item metadata
   - news item list
   - selected news item id
   - parsed/sanitized content
2. Stop mutating `news.newsitems` in Svelte components.
3. Parse BBCode either:
   - in `+page.server.ts` before sending page data, if DOMPurify sanitization can also run server-side safely, or
   - in a small client helper with derived values, if keeping DOMPurify browser-side is simpler.
4. Use one rendering strategy for external provider posts. Prefer sanitized `{@html}` inside `Article` over piping static provider HTML through an editor component.
5. Update `NavbarSearch.svelte` to link to `/steam/:appid/:slug`.
6. Update `GameCard.svelte` to link to `/steam/:appid/:slug`.
7. Remove `/game/[id]` after links are migrated.
8. Update `[createdBy]/[project]` so it only handles user/org-authored projects and no longer performs external Steam lookup by normalized name.

## Implementation Steps

### Phase 1: Route Canonicalization

- [x] Add a helper for external Steam URLs, probably near `SteamCatalog.ts` or a shared route utility.
- [x] Include `slug` in Steam search result DTOs.
- [x] Update search dropdown navigation to canonical Steam URLs.
- [x] Update popular game card links to canonical Steam URLs.
- [x] Add `/steam/[appid]/[[slug]]` route or equivalent SvelteKit route structure.
- [x] Delete `/game/[id]` or leave it only as a temporary local migration step while links are being moved.
- [ ] Add focused route/load tests where feasible.

### Phase 2: Parser Rewrite

- [x] Preserve current `BBCodeService.bbcodeToHtml(...)` public API during the rewrite.
- [x] Implement tokenizer with explicit token types and source positions.
- [x] Implement parser with a small AST and permissive recovery.
- [x] Implement renderer with safe tag definitions and URL validation.
- [x] Replace arbitrary style generation with safe class/style allowlists.
- [x] Keep DOMPurify sanitization in pages after conversion.
- [x] Run and update existing `BBCodeParser.test.ts`.

### Phase 3: Real Steam Fixtures

- [ ] Capture 5-10 representative Steam announcement bodies from local API responses or saved fixtures.
- [ ] Add fixture tests for the worst rendering cases.
- [ ] Compare current broken output against new output manually in the browser.
- [ ] Add any missing Steam tags found in fixtures.

### Phase 4: Page Rendering Cleanup

- [x] Remove duplicate BBCode rendering logic from `/game/[id]` and `[createdBy]/[project]`.
- [x] Use one Steam news page path and one component.
- [x] Keep `TipTap` for user-authored PatchHub editing and authored-content display where appropriate.
- [x] Replace `TipTap` usage only for external provider-rendered Steam patch notes with sanitized static HTML.
- [ ] Verify desktop and mobile layouts.

## Implementation Notes

- Added `src/lib/util/SteamRoute.ts` and canonical `/steam/[appid]/[[slug]]` routing with 308 canonical slug redirects.
- Search results and popular game DTOs now carry Steam slugs, and UI navigation uses `/steam/:appid/:slug`.
- Removed the legacy `/game/[id]` route and removed external Steam lookup from `[createdBy]/[project]`.
- Replaced the old BBCode converter internals with tokenizer/parser/renderer modules under `src/lib/services/bbcode` while preserving `BBCodeService.bbcodeToHtml(...)`.
- Current parser keeps legacy unit-test-compatible output for some old behaviors while adding explicit AST parsing, escaping, URL scheme validation, and unknown-tag fallback.
- `npm run check:svelte` is still blocked by pre-existing favorites API schema/locals errors and Storybook sample typing errors outside this task.
- Browser smoke test opened `/steam/32400/star-wars-dark-forces-classic-1995`; the route loaded and canonicalized to `/steam/32400/star-warstm-dark-forces-classic-1995` based on the current slug helper.

## Verification

Minimum:

- `npm run test:unit -- --run tests/BBCodeParser.test.ts`
- `npm run test:unit -- --run tests/UtilTests.test.ts`
- `npm run check:svelte`
- Focused ESLint on touched parser, routes, and components

Browser/manual:

- Open a Steam page from search.
- Open the same Steam page from a popular card.
- Confirm both land on the same canonical URL.
- Confirm headings, lists, links, images, videos, and malformed content render acceptably.
- Confirm external Steam posts do not show editor-specific spacing, wrappers, or chrome.
- Confirm DOMPurify strips unsafe HTML/URLs.

## Risks

| Risk                                             | Impact                                    | Mitigation                                                                 |
| ------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------- |
| Steam BBCode dialect has undocumented edge cases | Some posts still render oddly.            | Fixture corpus from real posts and unknown-tag escaped fallback.           |
| Parser emits unsafe HTML                         | XSS risk.                                 | Escape text/attributes, validate URLs, sanitize with DOMPurify.            |
| Route migration misses an internal link          | Internal navigation hits a removed route. | Use `rg` for old route patterns and update links before deleting routes.   |
| Overfitting to current fixtures                  | Future posts regress.                     | Keep parser recovery generic and add fixture tests as bugs are discovered. |
| Client-side parsing hurts page responsiveness    | Large Steam posts may feel slow.          | Consider server-side parse/cache after correctness is established.         |

## Open Questions

- Should canonical external routes be `/steam/:appid/:slug` or a more generic `/sources/steam/:appid/:slug`?
- Should parsed/sanitized Steam news be cached in the DB after fetch?
- Should external rendered HTML be generated server-side once DOMPurify is configured for SSR?
- Do we want to allow safe color/size styling from Steam posts, or normalize those tags to semantic classes?
- Should legacy `/software/[name]` be replaced by the same external source route pattern now or later?
