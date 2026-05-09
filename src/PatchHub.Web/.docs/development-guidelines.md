# Development Guidelines

## Product Principles

- PatchHub should help users find and understand updates quickly.
- Favor clear scanning, filtering, and source attribution over decorative UI.
- Preserve trust: show where update content came from, avoid overstating freshness, and handle missing data honestly.
- Build source integrations so more games, software projects, feeds, and APIs can be added without rewriting UI flows.

## TypeScript Standards

- Use strict, readable TypeScript with explicit types at module boundaries.
- Prefer `type` for object shapes unless an interface is needed for declaration merging.
- Avoid `any`. Use `unknown` with validation when input shape is uncertain.
- Avoid nested ternaries. Use named variables, helper functions, or straightforward `if` blocks.
- Avoid unused parameters, variables, and imports.
- Keep functions focused. Extract helpers when a function mixes parsing, validation, data access, and presentation.
- Prefer early returns for invalid or empty states.
- Use descriptive names that encode domain meaning, such as `patchNotes`, `sourceUrl`, and `releasedAt`.

## SvelteKit Standards

- Keep server-only code under `src/lib/server` or server route files.
- Do not import server-only modules into client components.
- Validate external API responses before trusting them.
- Put data loading in `+page.server.ts` when data requires secrets, server-only services, or authenticated context.
- Keep components presentation-focused. Move fetching, parsing, and persistence into services or load functions.

## Data and Services

- Services should hide external API details from routes and components.
- Normalize dates, source names, ids, and URLs close to the boundary where data enters the app.
- Keep parsing code deterministic and covered by unit tests when source formats are inconsistent.
- Prefer small composable service methods over large methods that fetch, transform, filter, and format all at once.

## Adding Software Sources

- Add manually curated software feeds in `src/lib/server/software/SoftwareSourceRegistry.ts`.
- Keep source-specific fetch/parsing behavior in `src/lib/server/software`, then return normalized `SoftwareUpdateEntry` DTOs to routes and remote functions.
- Use Svelte remote functions for app-internal software reads. Add `+server.ts` routes only for real HTTP boundaries or custom cache/header behavior.
- Seed searchable/favoriteable software rows through `SoftwareCatalogService.upsertRegisteredSources()`.

## Error Handling

- Fail gracefully in UI with useful empty and error states.
- Log enough context on the server to diagnose source failures without exposing secrets.
- Do not swallow errors silently unless there is an intentional fallback.
- Treat network, feed, and third-party API failures as expected states.
