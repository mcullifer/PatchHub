# Workspace Layout

- `src/routes` — SvelteKit pages, layouts, loads, and HTTP endpoints.
- `src/lib/components` — UI grouped by product area; reuse `common-ui` before adding primitives.
- `src/lib/remote` — SvelteKit remote functions for app-internal reads and mutations.
- `src/lib/server` — server-only auth, Convex access, HTTP clients, caching, and external sources.
- `src/lib/server/steam` — Steam catalog, API, assets, and update-source integration.
- `src/lib/server/software` — software source registry, fetching, parsing, and normalization.
- `src/lib/projects` — project banner and upload helpers shared by project UI.
- `src/lib/services` — client-safe domain services, including BBCode parsing.
- `src/lib/models` and `src/lib/util` — shared types and small utilities.
- `src/convex` — schema, queries, mutations, storage, jobs, and Convex tests.
- `tests` — unit and integration tests outside the Convex module.
- `e2e` — Playwright tests.
- `static` — public assets deployed with the app.
- `.github/assets` — repository-only README images; these are not SvelteKit static assets.
- `.docs` — durable PatchHub-specific architecture documentation.
