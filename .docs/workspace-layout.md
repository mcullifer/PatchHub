# Workspace Layout

- `src/routes`: SvelteKit routes, layouts, page loads, server loads, and API endpoints.
- `src/lib/components`: Svelte UI components grouped by product area. Prefer `src/lib/components/common-ui` before creating new UI primitives.
- `src/lib/components/update-feed`: Update feed UI for release notes, patch cards, filters, and feed presentation.
- `src/lib/components/wysiwyg`: Rich text and parsed-content rendering components.
- `src/lib/contexts`: Svelte context state for app-level concerns such as auth, theme, navigation, and shared UI state.
- `src/lib/models`: Domain and application model types. Prefer updating shared model types here over creating duplicate local shapes.
- `src/lib/remote`: SvelteKit remote functions for app-internal client/server reads and mutations.
- `src/lib/server`: Server-only modules, including database access, auth integration, external API clients, and source ingestion logic.
- `src/lib/server/software`: Software release source registry, fetchers, parsers, and normalized software update DTOs.
- `src/lib/server/steam`: Steam-specific source integration and app/update ingestion.
- `src/lib/services`: Client-safe application services and domain helpers.
- `src/lib/services/bbcode`: BBCode parsing and conversion helpers.
- `src/lib/util`: Shared utilities for dates, strings, formatting, and common helpers.
- `tests`: Unit/integration tests and test utilities.
- `.plans`: Tracked implementation plans for large refactors or multi-session work.
- `.docs`: Agent-facing project documentation that explains how to navigate and validate the repo.
