# PatchHub Agent Guidelines

PatchHub is a single place to discover updates from many sources: game patch notes, software release notes, news posts, feeds, and related project updates.

Agents should optimize for a product that is fast to scan, trustworthy, and easy to extend with new update sources.

## Read First

- `.docs/development-guidelines.md`
- `.docs/svelte-guidelines.md`
- `.docs/remote-functions-guidelines.md`
- `.docs/auth-and-organizations.md`
- `.docs/style-guidance.md`
- `.docs/testing-and-verification.md`
- `.docs/scripts.md`
- `.docs/workspace-layout.md`
- Any active plan in `.plans/`

## Documentation Map

- `.docs/development-guidelines.md` — product principles, TypeScript standards, SvelteKit boundaries, service patterns, source integration guidance, and error handling.
- `.docs/svelte-guidelines.md` — Svelte 5 runes, props, events, markup, component boundaries, and styling conventions.
- `.docs/remote-functions-guidelines.md` — when and how to use SvelteKit remote functions instead of app-internal JSON routes.
- `.docs/auth-and-organizations.md` — WorkOS, PatchHub user ownership, organization membership, and authorization boundaries.
- `.docs/style-guidelines.md` — PatchHub UI priorities, DaisyUI/Tailwind usage, accessibility, and layout expectations.
- `.docs/testing-and-verification.md` — risk-based testing guidance and manual verification expectations.
- `.docs/scripts.md` — package scripts and validation commands.
- `.docs/workspace-layout.md` — project folders and ownership boundaries.
- `.docs/agentic-workflow.md` — multi-session workflow, planning, handoff, and baseline-failure handling.

## Default Workflow

1. Read the relevant route, component, service, and tests before changing code.
2. Prefer existing local patterns over new abstractions.
3. Update or create a plan for multi-step work.
4. Make focused changes.
5. Run the smallest useful verification first, then broader checks when risk warrants it.
6. Leave handoff notes in the plan if work is incomplete.
