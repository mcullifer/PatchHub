# Testing and Verification

## Default Commands

Run checks according to the risk of the change:

- Type and Svelte validation: `npm run check`
- Svelte diagnostics only: `npm run check:svelte`
- TypeScript compiler check: `npm run check:types`
- Formatting and linting: `npm run lint`
- Formatting only: `npm run format:check`
- ESLint only: `npm run lint:eslint`
- Unit tests: `npm run test:unit -- --run`
- End-to-end tests: `npm run test:e2e`
- Full suite: `npm run test`
- Agent pre-handoff validation: `npm run validate`

## What to Test

- Parsing logic for feeds, BBCode, API responses, or source-specific formats.
- Service logic that normalizes patch notes, software updates, game metadata, favorites, and user state.
- Route behavior when authentication, missing data, redirects, or error states are involved.
- UI behavior for search, filters, menus, dropdowns, favorites, and pagination.

## Manual Verification

Use a browser check when a Svelte page, layout, or interactive component changes.

Verify:

- Loading, empty, error, and populated states.
- Desktop and mobile widths.
- Keyboard focus for interactive controls.
- No overlapping or clipped text.
- Links and source attribution go to the expected destinations.

## Before Handoff

Record in the active plan:

- Commands run and their results.
- Manual checks performed.
- Known gaps or skipped checks.
- Files changed and the next recommended step.
