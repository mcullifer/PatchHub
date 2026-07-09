# PatchHub Agent Instructions

## Task Completion Requirements

- `npm run validate` must pass before considering implementation work complete.
- If `npm run validate` fails, do not claim the task is complete. Fix the failures or clearly report the remaining blockers.
- Format edited files before validation. Use targeted Prettier for narrow changes, or `npm run format` for broad refactors.
- Never use `svelte-check` alone as the full TypeScript validation pass. Use `npm run check:types` or `npm run validate`.
- Never hide TypeScript errors with `any`, broad casts, or `@ts-ignore` unless the boundary is genuinely untyped and the reason is documented.
- Name tests after the production API, component, or behavior under test. Do not name test files after implementation phases, work units, tickets, or refactor plans.

## Project Snapshot

PatchHub is a SvelteKit / Svelte 5 / TypeScript web app for collecting patch notes, release notes, feeds, and update information from games, software projects, and related sources.

The product should be fast to scan, trustworthy about sources and timestamps, and easy to extend with new update providers.

PatchHub includes external sources in the meantime until users begin creating their own projects they post patch notes to.
Since the external sources require so many custom flows it's best to treat external sources separate from
the main user generated projects/patch notes.

## Read First

Before non-trivial work, read the relevant project docs:

- `.docs/README.md`
- Any active plan in `.plans/`

## Core Priorities

1. Correctness first.
2. Type safety first.
3. Preserve existing user workflows.
4. Keep behavior predictable during loading, failures, navigation, and async operations.
5. Prefer maintainable shared logic over duplicated local fixes.

If a tradeoff is required, choose type-safe, predictable behavior over short-term convenience.

## Engineering Posture

Prefer simple data flow, clear ownership, readable APIs, and minimal abstractions. Treat unnecessary wrappers, prop drilling, duplicated state, hidden coupling, brittle lifecycle code, and over-generic abstractions as design smells.

Preserve existing behavior unless the task explicitly changes it. Before finalizing, review the generated code for regressions, unclear boundaries, fragile lifecycle paths, missing error/loading/teardown handling, and tests needed for behavior that can regress.

For review-style requests, prioritize architectural and behavioral issues over surface-level style. Findings should explain why the structure is risky and what simpler shape would preserve behavior.

## Validation And Formatting

See `.docs/scripts.md` for the full command guide.

Format touched files before validation. For narrow edits, prefer targeted Prettier:

```bash
npx prettier --write path/to/file.ts path/to/file.svelte
```

Most implementation work should end with:

```bash
npm run validate
```

Use targeted commands from `.docs/scripts.md` when diagnosing failures, validating partial work, or checking a narrower change.

## Project Documentation

See `.docs/workspace-layout.md` for package and folder roles. Follow those boundaries when choosing where code belongs.

Use `.docs/` for durable project documentation and `.plans/` for active or historical implementation plans. Keep active plans updated with decisions, validation status, and handoff notes when work is unfinished.

## Svelte Work

For `.svelte`, `.svelte.ts`, and `.svelte.js` files:

- Follow `.docs/svelte-guidelines.md` and `.docs/style-guidelines.md`.
- Prefer modern Svelte 5 runes and patterns unless existing compatibility requires otherwise.
- Run the Svelte autofixer on edited Svelte components/modules before finalizing.
- Fix actionable autofixer findings and rerun it until clean.

## TypeScript Standards

Follow `.docs/development-guidelines.md`. Keep strict TypeScript behavior intact, use generated SvelteKit route types from `./$types`, and treat missing properties, bad imports, implicit `any`, and possibly undefined values as real errors.

## PatchHub Patterns

- Follow `.docs/remote-functions-guidelines.md` for app-internal client/server work.
- Follow `.docs/auth-and-organizations.md` for WorkOS, user, organization, and authorization boundaries.
- Keep source-specific fetching and parsing behind server modules or services, then return normalized DTOs to routes and UI.
- Reuse existing components in `src/lib/components/common-ui` before introducing new UI primitives.

## Large Refactors

For large refactors, do not rely on chat history as the source of truth. Create or update an execution plan under `.plans/` before or during implementation.

The plan document must include:

- durable goal
- non-goals
- affected files/modules
- invariants that must remain true
- completed work
- remaining work
- validation status and known failures

When continuing from a plan document, read it first, restate the remaining scope, then work until the documented goal is complete or a concrete blocker is found. Do not implement only the first mechanical step of a broader plan and call the refactor complete.

See `.docs/agentic-workflow.md` for the expected multi-session workflow.

## Existing Worktree

The worktree may contain unrelated user changes. Do not revert unrelated files. If unrelated changes appear in `git status`, ignore them unless they directly block the task.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
