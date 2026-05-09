# PatchHub Agent Guidelines

PatchHub is a single place to discover updates from many sources: game patch notes, software release notes, news posts, feeds, and related project updates.

Agents should optimize for a product that is fast to scan, trustworthy, and easy to extend with new update sources.

## Read First

- `.docs/development-guidelines.md`
- `.docs/svelte-guidelines.md`
- `.docs/remote-functions-guidelines.md`
- `.docs/ui-guidelines.md`
- `.docs/testing-and-verification.md`
- Any active plan in `.plans/`

## Default Workflow

1. Read the relevant route, component, service, and tests before changing code.
2. Prefer existing local patterns over new abstractions.
3. Update or create a plan for multi-step work.
4. Make focused changes.
5. Run the smallest useful verification first, then broader checks when risk warrants it.
6. Leave handoff notes in the plan if work is incomplete.
