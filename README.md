# PatchHub

SvelteKit app deployed as a Cloudflare Worker, with [Convex](https://convex.dev) as the backend and WorkOS AuthKit for authentication.

## Requirements

- Node 22.12+ (see `.node-version`)

## Setup

```bash
npm ci
```

Environment files (never commit real values):

- `.env.local` — managed by the Convex CLI (`npx convex dev` writes the deployment and `PUBLIC_CONVEX_URL` here). `PUBLIC_CONVEX_URL` is baked into the build via `$env/static/public`, so it must be present at build time.
- `.env` — your local WorkOS and server-secret values. Copy `.env.example` and fill it in. Both Vite (`npm run dev`) and Wrangler (`npm run preview`) read it.

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
