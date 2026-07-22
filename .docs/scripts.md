# Scripts

## Development and Worker

- `npm run dev` — start the Vite development server.
- `npm run build` — build the Cloudflare Worker into `.svelte-kit/cloudflare`.
- `npm run preview` — build and run the Worker locally on port 4173.
- `npm run preview:worker` — run the existing Worker build without rebuilding.
- `npm run check:worker` — build and run `wrangler deploy --dry-run`.

Local environment values come from `.env` and `.env.local`; start from `.env.example`. Running
`npx convex dev` manages the Convex development deployment and writes its public URL.

## Validation

- `npm run validate` — final gate: Svelte diagnostics, plain TypeScript, formatting, ESLint, and
  unit tests.
- `npm run check` or `npm run check:svelte` — Svelte diagnostics.
- `npm run check:types` — plain `tsc --noEmit` validation.
- `npm run lint` — Prettier check followed by ESLint.
- `npm run format` — write Prettier formatting across the repository.
- `npm run test:unit -- --run` — run Vitest once.
- `npm run test:e2e` — run Playwright.
- `npm test` — run unit and end-to-end tests.

Format narrow edits with targeted Prettier before running `npm run validate`.
