# Plan: API Routes To Remote Functions

Status: Implemented
Owner: Codex
Created: 2026-06-09
Last Updated: 2026-06-09

## Goal

Remove app-internal JSON API routes in favor of SvelteKit remote functions or direct server calls. Keep route handlers only for real HTTP boundaries such as auth callbacks, webhooks, file/binary responses, custom cache/header behavior, health checks, and secured operational endpoints.

## Non-Goals

- Do not remove auth route handlers such as `/auth/login`, `/auth/callback`, or `/auth/logout`.
- Do not add new product behavior beyond preserving the existing search, favorites, top games, game news, and Steam header image flows.
- Do not migrate operational endpoints that may be added later, such as a secured Steam sync trigger.

## Current Understanding

- Existing remotes already cover game search, game news, most-popular games, software summaries, and favorites.
- Removed `src/routes/api/**` files were:
  - `src/routes/api/games/news/+server.ts`
  - `src/routes/api/games/search/+server.ts`
  - `src/routes/api/games/mostpopular/+server.ts`
  - `src/routes/api/favorites/+server.ts`
  - `src/routes/api/favorites/[id]/+server.ts`
  - `src/routes/api/steam/apps/[appid]/header-image/+server.ts`
- Current `/api` consumers are:
  - `src/lib/services/GameService.ts`
  - `src/lib/services/FavoritesService.ts`
  - `src/lib/services/ApiService.ts`
  - `src/lib/contexts/ApiContext.svelte.ts`
  - `src/routes/+layout.svelte`
  - `src/routes/steam/[appid]/[[slug]]/+page.server.ts`
  - `src/lib/components/common-ui/NavbarSearch.svelte`
  - `src/lib/components/common-ui/GameCard.svelte`

## Invariants

- Search remains debounced and navigates to canonical Steam routes.
- Steam detail pages still load app metadata, header image URL, and news.
- Home page favorites remain auth-aware and unauthenticated users still see empty favorite data.
- Header image fallback behavior still attempts the Steam CDN URL first, then the Steam appdetails API.
- Remote function arguments must be schema validated.

## Implementation Steps

- [x] Inventory API routes, remote functions, and `/api` consumers.
- [x] Add a remote query for Steam header image resolution.
- [x] Replace game search API fetches with `searchGames`.
- [x] Replace Steam page `ApiService` usage with direct server service calls.
- [x] Remove the unused API service/context layer.
- [x] Delete obsolete app-internal JSON API route handlers.
- [x] Delete the empty `src/routes/api` directory tree.
- [x] Collapse duplicate top-games remote behavior into `games.remote.ts`.
- [x] Format touched files and run Svelte autofixer on edited Svelte files.
- [x] Run `npm run validate`.

## Validation Status

- `npm run validate` passed on 2026-06-09.

## Handoff Notes

- This plan is intentionally scoped to app-internal JSON API routes. Auth and other real HTTP-boundary route handlers are out of scope.
- `MenuItem.svelte` keeps the local `svelte/no-navigation-without-resolve` disable for generic href passthrough, matching `/Users/max/dev/unified-rewrite/src/lib/Components/CommonUI/MenuItem.svelte`.
