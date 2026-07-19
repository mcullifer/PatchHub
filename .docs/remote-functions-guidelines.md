# Remote Functions Guidelines

PatchHub uses SvelteKit remote functions for type-safe communication between the client and server. Prefer remote functions over hand-written JSON API routes for app-internal data reads and mutations.

The project has the required experimental flags enabled in `svelte.config.js`:

- `kit.experimental.remoteFunctions`
- `compilerOptions.experimental.async`

Remote functions are experimental in SvelteKit, so agents should check current Svelte docs when changing patterns or adding new remote function types.

## Default Choice

Use `.remote.ts` files and `$app/server` helpers for app-owned client/server work:

- `query` for reading dynamic server data.
- `query.batch` when many similar reads could create an N+1 request pattern.
- `query.live` only for genuinely live server data.
- `form` for progressive-enhanced form submissions.
- `command` for imperative server mutations that are not naturally forms.
- `prerender` for server data that can be generated at build time.

Keep remote files under `src`, but not in `src/lib/server`.

## Page Reads

App-owned page reads use remote `query` functions (wrapping Convex queries) awaited directly in the component, not `+page.server.ts` load functions. Derive authorization inside the query from validated arguments and `getAuthContext(getRequestEvent())` — never from `getRequestEvent().params`/`url`.

Status-code caveat: `error(404)` thrown by an awaited query sets the real response status **only when no ancestor `<svelte:boundary>` has a `pending` snippet** — any pending snippet above the await (including in a parent layout) starts streaming SSR, which commits a 200 before the query settles. Since the project layout uses pending skeletons, pages whose primary query can 404 pair the component await with a thin SSR-only universal load:

```ts
// +page.ts
export const load: PageLoad = async ({ params }) => {
	if (browser) return;
	await getProjectPost({ ... });
};
```

During SSR the load and the component share one query execution (SvelteKit dedupes per request), so this costs nothing extra; on client navigation the load no-ops and the boundary skeleton behavior is unchanged. See `src/routes/[createdBy=owner]/+page.ts` and siblings. Reserve full `+page.server.ts` loads for the rare cases a query can't cover (e.g. work that must run before the component renders, or response shaping queries don't support).

## Validation

- Validate remote function arguments with Valibot or another Standard Schema library.
- Do not use `'unchecked'` unless there is a clear reason and the input is still validated inside the handler.
- Treat remote functions as exposed HTTP endpoints. Never trust client input.
- Use `getRequestEvent` inside remote functions when request context, cookies, or locals are needed.

## Data Access

- Remote function handlers may import server-only modules such as DB clients, source clients, and services.
- Keep source API clients and DB-heavy logic in server modules, then call them from remote functions.
- Do not leak secrets, raw provider responses, or internal metadata to the client unless the UI explicitly needs them.
- Return UI-ready DTOs instead of database rows when a route/component does not need every column.

## API Routes

Use `+server.ts` API routes only when the endpoint is meant to be a real HTTP boundary, such as:

- Webhooks from external services.
- Public API endpoints for non-Svelte clients.
- File downloads, streaming responses, custom headers, or special cache behavior.
- Health checks or deployment platform hooks.
- Secured operational endpoints, such as a cron/admin trigger.

Do not add new `src/routes/api/**/+server.ts` files for ordinary component data fetching when a remote `query`, `form`, or `command` fits.

## Existing Code

- Prefer adding new behavior to existing remote modules such as `src/lib/remote/*.remote.ts`.
- When touching old API-route-backed UI, consider migrating it to remote functions if the change is already in that area.
- Avoid large mechanical migrations unless the active task calls for it.
