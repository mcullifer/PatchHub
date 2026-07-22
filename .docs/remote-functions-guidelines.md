# Remote Functions

PatchHub uses SvelteKit remote functions for app-internal client/server communication. The required
`remoteFunctions` and async compiler flags are enabled in `svelte.config.js`.

## Defaults

- Put remote functions in `src/lib/remote/*.remote.ts`.
- Order each module as imports, validation schemas, exported remote functions, then private helpers.
- Use `query` for reads, `form` for progressively enhanced forms, and `command` for imperative
  mutations.
- Use `query.batch` when repeated reads would create an N+1 pattern. Use `query.live` only when the
  data genuinely needs to stay live.
- Keep external clients and database-heavy logic in `src/lib/server`, then return UI-ready DTOs
  from the remote function.
- Validate every argument with Valibot or another Standard Schema. Treat remote functions as
  public HTTP endpoints.
- Use `requireAuth(getRequestEvent())` for a cheap WorkOS session precheck before authenticated
  Convex calls. Use `getAuthContext` only when the SvelteKit request needs PatchHub user data or
  provisioning status.
- Authenticate user-scoped Convex clients with the WorkOS access-token JWT. Convex must still
  derive the user and enforce ownership; never trust ownership ids supplied by the client.
- Return owner ids instead of viewer-specific `isOwner` flags. Components derive UI visibility
  from the current user in root layout data; backend authorization remains independent.

## Route Loads and 404 Responses

Pages normally await remote queries directly in the Svelte component. A query that throws
`error(404)` cannot set the HTTP status after an ancestor `<svelte:boundary>` pending snippet has
started streaming the response.

Routes whose primary query may 404 therefore also use a thin SSR-only universal load:

```ts
export const load: PageLoad = async ({ params }) => {
	if (browser) return;
	await getProjectPost({ ... });
};
```

SvelteKit deduplicates the load and component query during SSR. On client navigation the load does
nothing, so the boundary still provides the pending UI. Existing owner, project, and post routes
show this pattern.

## When to Use `+server.ts`

Use an API route only for a real HTTP boundary: webhooks, public APIs, downloads, streaming,
special headers or caching, health checks, or secured operational hooks. Do not create JSON routes
for ordinary component reads and mutations when a remote function fits.
