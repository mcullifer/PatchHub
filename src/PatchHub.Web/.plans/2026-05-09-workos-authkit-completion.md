# Plan: WorkOS AuthKit Completion

Status: Implemented, pending manual auth-flow verification
Owner: Codex
Created: 2026-05-09
Last Updated: 2026-05-09

## Goal

Finish PatchHub's WorkOS AuthKit integration so users can sign in, sign up, complete PatchHub account setup, stay signed in through AuthKit-managed sessions, sign out cleanly, and have a reliable internal `user` row for app-owned features such as favorites and future project creation.

The implementation should follow WorkOS AuthKit's hosted authentication flow while keeping PatchHub's internal user profile data in SQLite/Postgres via existing Drizzle services.

## Non-Goals

- Do not build custom username/password authentication.
- Do not replace WorkOS Hosted AuthKit with a client-only auth flow.
- Do not add organization membership, SSO enrollment, role/permission UI, or organization switching unless needed to keep the current session model correct.
- Do not migrate every old `/api/**` route to remote functions as part of this work.
- Do not store secrets or sensitive auth data in WorkOS metadata.

## Current Understanding

- Product behavior:
  - Unauthenticated users see a `Login / Signup` button in `src/routes/+layout.svelte`.
  - Authenticated users without a PatchHub DB user row are redirected to `/auth/setup`.
  - `/auth/setup` asks for a username, creates a DB user, then updates the WorkOS user with `externalId` and username metadata.
  - Favorites currently rely on `event.locals.auth.user.externalId` being present.
- Relevant routes/components:
  - `src/routes/+layout.svelte`
  - `src/routes/+layout.server.ts`
  - `src/routes/auth/callback/+server.ts`
  - `src/routes/auth/logout/+server.ts`
  - `src/routes/auth/setup/+page.server.ts`
  - `src/routes/auth/setup/+page.svelte`
  - `src/lib/components/ProfileDropdown.svelte`
- Relevant services/server modules:
  - `src/hooks.server.ts`
  - `src/lib/remote/auth.remote.ts`
  - `src/lib/remote/favorites.remote.ts`
  - `src/lib/server/UserService.ts`
  - `src/lib/server/WorkOSClient.ts`
- Relevant data models/schema:
  - `src/lib/server/db/schema.ts` has `user.authProviderId`, `username`, `email`, timestamps, and soft-delete fields.
  - `organization` exists but is not currently wired into AuthKit behavior.
- External APIs or integrations:
  - `@workos/authkit-sveltekit@0.0.1-alpha.0`
  - `@workos-inc/node@7.72.2`
  - Required env values: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD`
  - WorkOS dashboard Redirects must include the callback URI, sign-in endpoint, and sign-out/logout redirect.

## Documentation Findings

- AuthKit requires a callback route whose URL matches `WORKOS_REDIRECT_URI` and the WorkOS Dashboard redirect URI.
- AuthKit sign-in requests should originate from an app-owned sign-in endpoint, so PatchHub should expose a clear `/auth/login` or equivalent route that redirects to the AuthKit authorization URL.
- WorkOS sign-out must clear the app session and redirect through WorkOS' logout endpoint; the dashboard also needs a default sign-out/logout redirect configured.
- AuthKit sessions include access and refresh tokens. The framework SDK should own token validation, refresh, and cookie session handling where possible.
- WorkOS external identifiers are intended for associating WorkOS users with app-owned user IDs and must be unique within the environment and no longer than 64 characters.
- WorkOS metadata is limited and should not hold sensitive information; storing `username` there is acceptable only as a convenience mirror, not the source of truth.
- The installed SvelteKit AuthKit package supports `configureAuthKit`, `authKitHandle`, `authKit.handleCallback()`, `authKit.getUser(event)`, `authKit.getSignInUrl(...)`, `authKit.getSignUpUrl(...)`, `authKit.signOut(event)`, `authKit.withAuth(...)`, and `authKit.refreshSession(event)`.

## Decisions

| Date       | Decision | Reason |
| ---------- | -------- | ------ |
| 2026-05-09 | Keep `@workos/authkit-sveltekit` for now, but treat it as alpha and wrap usage carefully. | The current code already uses it and its API matches the desired SvelteKit flow, but future package churn is likely. |
| 2026-05-09 | Use app-owned auth routes for login, callback, logout, and setup. | WorkOS docs expect sign-in to originate in the application and the SvelteKit SDK exposes route handlers for callback/logout. |
| 2026-05-09 | Keep PatchHub's database user as the source of truth for username and internal id. | WorkOS external IDs/metadata are integration fields, not the app profile store. |
| 2026-05-09 | Prefer resolving internal user id from the DB when possible, not only from `locals.auth.user.externalId`. | `externalId` may be absent immediately after callback or stale until the session refreshes. |
| 2026-05-09 | Add a narrow server auth helper instead of repeating WorkOS/DB user lookup in every route/remote function. | Favorites and future authenticated features need consistent behavior and error handling. |

## Open Questions

- [ ] What exact production base URL will be used for WorkOS redirect and logout settings?
- [ ] Should login and signup be separate buttons/URLs, or is one `Login / Signup` AuthKit entry point preferred?
- [ ] Should username setup remain required for all users before app use, or can PatchHub auto-create a username from email and let users edit it later?
- [ ] Should soft-deleted users be allowed to sign back in and restore, or blocked/admin-reviewed?
- [ ] Are organizations part of the first auth release, or should organization claims be ignored until project ownership needs them?

## Risks

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Alpha SvelteKit SDK behavior changes | Future package upgrades may break auth handlers or types. | Centralize imports/usage and add auth smoke tests around routes. |
| Missing WorkOS dashboard redirects | Users cannot complete login/logout even if code is correct. | Document exact dashboard values and verify locally against `.env`. |
| `externalId` not present in the current session after setup | Favorites and authenticated features can still return unauthorized. | Resolve internal user by `authProviderId` in server helpers and optionally refresh session after updating WorkOS. |
| Setup race or duplicate creation | Double submit could violate unique constraints or show a generic 500. | Make `createUser` idempotent around `authProviderId` and username uniqueness handling. |
| Redirect loop around `/auth/setup` | Authenticated users could be trapped if DB lookup fails. | Exclude auth routes intentionally and fail with a visible setup error instead of silent continuation. |
| Secrets or static env assumptions fail in deployment | Build/runtime can fail or secrets can be baked incorrectly. | Prefer `$env/dynamic/private` if deployment injects secrets at runtime; validate env at startup. |

## Implementation Steps

- [ ] Confirm WorkOS dashboard and local `.env` values:
  - `WORKOS_REDIRECT_URI` should match `/auth/callback`.
  - Dashboard sign-in endpoint should point to PatchHub's app-owned login endpoint.
  - Dashboard sign-out/logout redirect should point to a valid PatchHub URL such as `/`.
  - `WORKOS_COOKIE_PASSWORD` should be at least 32 characters and generated securely.
- [ ] Decide and implement a dedicated login endpoint:
  - Add `src/routes/auth/login/+server.ts` that calls `authKit.getSignInUrl(...)` and redirects.
  - Keep the remote `signIn` form only if the UI benefits from SvelteKit remote forms; otherwise simplify the layout to link/post to `/auth/login`.
  - Preserve `returnTo` behavior so protected pages can send users back after sign-in.
- [ ] Harden `src/hooks.server.ts`:
  - Move env configuration to a small validated server module or use `$env/dynamic/private` if runtime deployment needs it.
  - Do not swallow AuthKit errors silently outside the known logout revocation issue.
  - Exclude `/auth/callback`, `/auth/logout`, static assets, and `/auth/setup` from setup redirects.
  - Replace broad comments with precise comments only where needed.
- [ ] Create a server auth helper, likely under `src/lib/server/auth/`:
  - Return `workosUser`, `dbUser`, `internalUserId`, and auth organization/session details when available.
  - Provide `requireAuth` and `requireInternalUser` helpers for server loads, remotes, and API routes.
  - Ensure helpers never import into client modules.
- [ ] Make user provisioning idempotent:
  - Add a `createOrGetUserForWorkOSUser` service method or transactional equivalent.
  - Handle duplicate `authProviderId` and username collisions cleanly.
  - Keep `username` validation in the remote function schema.
  - Consider updating WorkOS externalId after DB creation and then redirecting through a session refresh if the SDK supports it reliably.
- [ ] Update authenticated data paths:
  - Replace direct `event.locals.auth.user?.externalId` usage in `src/lib/remote/favorites.remote.ts` with the new server auth helper.
  - Check old API favorite routes and either update them or mark them for later migration if unused.
  - Update `+layout.server.ts` to reuse the same helper so header user data matches protected behavior.
- [ ] Improve setup UX and Svelte correctness:
  - Run the Svelte autofixer on `src/routes/auth/setup/+page.svelte` after edits.
  - Replace legacy `class:loading` if touching the button, following current Svelte 5 class array/object guidance.
  - Show a clear form-level error if DB creation or WorkOS update fails.
- [ ] Add tests:
  - Unit-test username validation and user provisioning service behavior.
  - Add route/load tests or integration tests for unauthenticated setup redirect, authenticated missing-user setup redirect, and authenticated existing-user passthrough.
  - Add tests for favorites requiring an internal user without depending on WorkOS `externalId` being present.
- [ ] Manual auth verification:
  - Start dev server.
  - Sign up with a new WorkOS user.
  - Confirm callback creates an AuthKit session and redirects to `/auth/setup`.
  - Submit a username and confirm a DB `user` row exists.
  - Confirm header shows the profile dropdown.
  - Favorite/unfavorite an item.
  - Logout and confirm session cookie is cleared and WorkOS redirects back to PatchHub.
  - Sign in again and confirm no setup redirect loop.

## Verification

- [ ] `npm run check`
- [ ] `npm run check:svelte`
- [ ] `npm run check:types`
- [ ] `npm run lint`
- [ ] `npm run test:unit -- --run`
- [ ] `npm run test:e2e` if auth browser workflows are covered or added
- [ ] Svelte autofixer on any changed `.svelte` files
- [ ] Manual browser auth flow with WorkOS sandbox credentials

## Handoff Notes

- Completed:
  - Read PatchHub project docs and active plan guidance.
  - Inspected current WorkOS/AuthKit implementation in hooks, layout load, callback/logout routes, setup page, auth remote functions, user service, schema, and favorites remotes.
  - Checked installed `@workos/authkit-sveltekit` README/types.
  - Checked current WorkOS AuthKit docs for redirect, sign-in endpoint, sessions/logout, and external IDs/metadata.
- Completed in implementation pass:
  - Added `/auth/login` as the app-owned AuthKit sign-in endpoint with sanitized `returnTo` support.
  - Added `src/lib/server/auth/AuthContext.ts` to centralize WorkOS user, DB user, and internal user-id resolution.
  - Switched hooks/layout/setup/favorites to resolve internal users from the DB instead of depending on WorkOS session `externalId`.
  - Moved AuthKit config to `$env/dynamic/private` and preserved logging for unexpected AuthKit errors.
  - Made setup provisioning idempotent by `authProviderId` and kept the PatchHub DB user as the app-owned profile/source for username and favorites.
  - Updated legacy favorite API routes away from removed `catalog`/`favorite` schema symbols.
  - Added a focused unit test for auth return path sanitization.
- In progress:
  - Manual WorkOS sign-in/setup/favorite/logout flows are intentionally left for the user to test with local secrets.
- Next best step:
  - Run the manual auth verification checklist in a browser with WorkOS sandbox credentials.
- Files changed:
  - `.plans/2026-05-09-workos-authkit-completion.md`
  - `src/hooks.server.ts`
  - `src/lib/remote/auth.remote.ts`
  - `src/lib/remote/favorites.remote.ts`
  - `src/lib/remote/index.ts`
  - `src/lib/server/UserService.ts`
  - `src/lib/server/auth/AuthContext.ts`
  - `src/lib/server/auth/returnTo.ts`
  - `src/routes/+layout.server.ts`
  - `src/routes/+layout.svelte`
  - `src/routes/api/favorites/+server.ts`
  - `src/routes/api/favorites/[id]/+server.ts`
  - `src/routes/auth/login/+server.ts`
  - `src/routes/auth/logout/+server.ts`
  - `src/routes/auth/setup/+page.server.ts`
  - `src/routes/auth/setup/+page.svelte`
  - `tests/AuthReturnTo.test.ts`
- Known issues:
  - `npm run check` is blocked by existing Storybook sample typing errors in `src/stories/Page.svelte`.
  - `npm run check:types` is blocked by existing implicit `any` errors in several non-auth route files.
  - `npm run lint:eslint` is blocked by existing lint errors in common UI/demo/software/story files and an unused parameter in `src/routes/api/games/news/+server.ts`.
- Commands already run:
  - Read project docs under `.docs/`.
  - Searched auth-related files with `rg`.
  - Read WorkOS/AuthKit package README/types from `node_modules`.
  - `npx prettier --write` on changed auth/favorites/setup files.
  - Svelte autofixer on `src/routes/+layout.svelte` and `src/routes/auth/setup/+page.svelte`.
  - `npm run check` failed only on existing `src/stories/Page.svelte` typing errors after auth fixes.
  - `npm run check:types` failed only on existing non-auth implicit `any` errors after auth fixes.
  - `npm run lint:eslint` failed only on existing non-auth lint errors after auth fixes.
  - `npm run test:unit -- --run` passed: 4 files, 61 tests.
