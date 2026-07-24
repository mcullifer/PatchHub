# PatchHub Agent Instructions

## Project Overview

PatchHub is a SvelteKit, Svelte 5, and TypeScript app for collecting patch notes, release notes, feeds, and other updates from games and software projects.

The product should be fast to scan and easy to extend with new update providers.

Keep external sources separate from user-created projects and patch notes because their workflows differ.

## Formatting And Validation

Format edited files before validation. Use targeted Prettier for narrow changes.

```bash
npx prettier --write path/to/file.ts path/to/file.svelte
```

Use this for broad formatting:

```bash
npm run format
```

`npm run validate` must pass before implementation work is complete:

```bash
npm run validate
```

Fix validation failures or report what remains blocked. See `.docs/scripts.md` for targeted commands.

## PatchHub Patterns

- Follow `.docs/remote-functions-guidelines.md` for app-internal client/server work.
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
