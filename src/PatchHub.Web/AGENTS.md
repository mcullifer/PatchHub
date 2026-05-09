# PatchHub Agent Instructions

You are working in PatchHub, a SvelteKit and TypeScript web app for collecting patch notes, release notes, and update information from many sources into one place.

## Required Reading

Before non-trivial work, read:

- `.docs/README.md`
- `.docs/development-guidelines.md`
- `.docs/svelte-guidelines.md`
- `.docs/remote-functions-guidelines.md`
- `.docs/ui-guidelines.md`
- `.docs/testing-and-verification.md`
- Any active plan in `.plans/`

## Planning

- Use `.plans/templates/feature-plan.md` for multi-step work.
- Keep active plans updated as decisions and implementation status change.
- Add handoff notes before stopping with unfinished work.

## Code Quality

- Use modern Svelte 5 and SvelteKit conventions.
- Write clean, readable, fully functional TypeScript.
- Avoid nested ternaries, unused variables, unused imports, and overly clever abstractions.
- Prefer existing project patterns and components before introducing new ones.
- Validate external data and keep server-only code out of client modules.
- Prefer SvelteKit remote functions in `.remote.ts` files over old-style app-internal JSON API routes. Use `+server.ts` routes only for real HTTP boundaries like webhooks, public APIs, downloads, health checks, or cron/admin triggers.

## UI Priority

When building UI, use this order:

1. Existing components in `src/lib/components/common-ui`.
2. DaisyUI components and semantic theme classes.
3. Tailwind utilities for layout, spacing, and responsive adjustments.
4. Custom CSS only when necessary.

## Verification

Use the smallest checks that give confidence, then broaden based on risk:

- `npm run check`
- `npm run check:svelte`
- `npm run check:types`
- `npm run lint`
- `npm run format:check`
- `npm run test:unit -- --run`
- `npm run test:e2e` when browser workflows change
