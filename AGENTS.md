# PatchHub Agent Instructions

## Project Overview

PatchHub is a SvelteKit, Svelte 5, and TypeScript app for collecting patch notes, release notes, feeds, and other updates from games and software projects.

The product should be fast to scan and easy to extend with new update providers.

Keep external sources separate from user-created projects and patch notes because their workflows differ.

## Coding preferences - general

When writing code aim for clean/simple/readable.

- Keep things simple. Channel "yagni" energy unless told otherwise.
  - Unnecessary wrappers, prop drilling, duplicated state, hidden coupling, brittle lifecycle code, and over-generic abstractions as design smells.
- Typesafety is useful, take advantage of it.
- Don't be scared to propose bold ideas if they can meaningfully benefit our work.
- Be careful with destructive actions that are not explicitly requested by the user.
- Tests are good! What is not good is: endless smoke tests, "regression tests" for feature deletions, etc. Tests should be focused, not slop.
- Don't add code comments within function bodies, but you may (concisely) describe how functions are used above function definitions, classes, etc. A soft metric to evaluate code quality is the code itself is the documentation, so it should be written simply and concisely where someone can read it and understand what is happening. Only add JSDoc/description comments for complex or non-obvious behavior.
- Keep comments up to date when making changes to keep things in sync.
- Do not use nested ternaries.

For review-style requests, prioritize architectural and behavioral issues over surface-level style. Findings should explain why the structure is risky and what simpler shape would preserve behavior.

## TypeScript & Svelte Standards

### TypeScript Standards

- Treat missing properties, missing methods, bad imports, implicit `any`, and possibly undefined values as real errors.
  - Never hide TypeScript errors with `any`, broad casts, or `@ts-ignore` unless the boundary is genuinely untyped and the reason is documented.
- Prefer precise types at boundaries. Do not use casts to force incompatible APIs together.
- If third-party types are wrong or incomplete, isolate the workaround at the smallest boundary and document why.

### Svelte Standards

For `.svelte`, `.svelte.ts`, and `.svelte.js` files:

- Use modern Svelte 5 runes and patterns.
- Use Svelte documentation lookup when framework behavior or syntax is uncertain or when using remote functions.
- Run the Svelte autofixer on edited Svelte components/modules before finalizing.
  - Fix actionable autofixer findings and rerun it until clean.
- Use `$derived` for computed state. Avoid updating state inside `$effect` unless integrating with external APIs or imperative libraries.
- Treat props as changeable. Use `$derived` when local values must update with prop changes.

### Composable Utilities

Use composable utilities to encapsulate reusable behavior with clear ownership.

- A composable may be a `useSomething()` function, focused module, or `.svelte.ts` state factory.
- Extract behavior when it is reused or when it simplifies complex state, lifecycle, cleanup, subscriptions, timers, browser APIs, or async coordination.
- Use Svelte runes when the utility owns reactive state. Keep its public API small, typed, and domain-specific.
- A utility that creates listeners, subscriptions, timers, or other resources must also own their cleanup.
- Do not extract simple one-off behavior or introduce wrappers that obscure ownership and control flow.

## Formatting And Validation

See `.docs/scripts.md` for targeted commands.

Format touched files before validation. Run `npm run format` for broad refactors. For narrow edits, prefer targeted Prettier:

```bash
npx prettier --write path/to/file.ts path/to/file.svelte
```

Never use `svelte-check` alone as the full TypeScript validation pass. Use `npm run check:ts` or `npm run validate`. Most implementation work should end with:

```bash
npm run validate
```

- `npm run validate` must pass before considering implementation work complete.
- If `npm run validate` fails, do not claim the task is complete. Fix the failures or clearly report the remaining blockers.

Name tests after the production API, component, or behavior under test. Do not name test files after implementation phases, work units, tickets, or refactor plans.

- For multiple test files that relate to a concept, group them together under a subfolder of `tests/`.

## PatchHub Patterns

- Follow `.docs/remote-functions-guidelines.md` for app-internal client/server work + remote function usage.
- Follow `.docs/auth-and-organizations.md` for WorkOS, user, organization, and authorization boundaries.
- Keep source-specific fetching and parsing behind server modules or services, then return normalized DTOs to routes and UI.
- Reuse existing components in `src/lib/components/common-ui` before introducing new UI primitives.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
