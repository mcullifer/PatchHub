# Scripts And Validation

## Development

- `npm run dev` — starts the Vite development server. Use this for normal development.
- `npm run build` — builds the SvelteKit app as a Cloudflare Worker (`.svelte-kit/cloudflare`).
- `npm run preview` — builds and starts the Cloudflare Worker locally with Wrangler (workerd) on port 4173. Requires a `.dev.vars` file (copy `.dev.vars.example`).
- `npm run preview:worker` — starts an already-built Worker without rebuilding.
- `npm run check:worker` — builds and performs a `wrangler deploy --dry-run` without deploying.

## Validation

- `npm run validate` — final completion gate for implementation work. Runs type/Svelte checks, formatting check, and ESLint.
- `npm run check` — runs both Svelte diagnostics and plain TypeScript diagnostics.
- `npm run check:svelte` — runs Svelte diagnostics with `svelte-check`.
- `npm run check:types` — runs `tsc --noEmit --project ./tsconfig.json`. This catches plain TypeScript errors that Svelte-only checks can miss.
- `npm run format:check` — checks Prettier formatting.
- `npm run lint:eslint` — runs ESLint without first running Prettier.
- `npm run lint` — runs Prettier check first, then ESLint.
- `npm run test:unit` — runs Vitest.
- `npm run test` — runs Playwright tests.

## Formatting

- `npm run format` — runs Prettier write mode across the repo.
- For narrow edits, prefer targeted formatting:

```bash
npx prettier --write path/to/file.ts path/to/file.svelte
```

## Agent Completion Rule

Do not consider implementation complete until `npm run validate` passes, unless the user explicitly asks for partial work or the remaining failures are documented as known baseline failures.

If `npm run lint` stops at Prettier, run `npm run lint:eslint` separately when ESLint diagnostics are still needed.
