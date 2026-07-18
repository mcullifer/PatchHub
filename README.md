# PatchHub

SvelteKit app deployed as a Cloudflare Worker, with [Convex](https://convex.dev) as the backend and WorkOS AuthKit for authentication.

## Requirements

- Node 22.12+ (see `.node-version`)

## Setup

```bash
npm ci
```

Environment files (never commit real values):

- `.env.local` — build-time and Vite dev variables. Copy `.env.example` and fill in the values. `PUBLIC_CONVEX_URL` is baked into the build via `$env/static/public`, so it must be present at build time.
- `.dev.vars` — runtime bindings for the local Worker (`npm run preview`). Copy `.dev.vars.example` and fill in the values. If `.dev.vars` is absent, Wrangler falls back to reading `.env`/`.env.local`.

## Development

```bash
npm run dev          # Vite dev server
npm run preview      # build + run the Cloudflare Worker locally (port 4173)
```

## Validation

```bash
npm run validate     # svelte-check, tsc, lint, unit tests
npm run check:worker # build + wrangler deploy --dry-run (no deployment)
npm run test:e2e     # Playwright against the local Worker
```
