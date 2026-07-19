# Plan: Personal Auth Hardening

Status: Complete
Owner: Codex
Created: 2026-06-16
Last Updated: 2026-06-16

## Goal

Harden PatchHub's personal-account WorkOS integration so WorkOS owns authentication/session
state, PatchHub owns app user state and authorization, and the current setup/profile/logout flows
behave predictably during missing users, deleted users, callback errors, and username creation.

## Decisions

- Keep `+layout.server.ts` for root auth display data. This is still the right SvelteKit primitive
  for SSR-safe, server-only auth data.
- Do not add root auth context in this pass. Use props for direct children such as
  `ProfileDropdown`, and `$app/state` `page.data.user` for deep read-only UI checks.
- Store the WorkOS user id in PatchHub as `user.authProviderId`.
- Keep only `externalId = dbUser.id.toString()` in WorkOS as a correlation pointer.
- Do not write PatchHub username or other app-owned profile metadata to WorkOS.
- Store usernames lowercase.
- Allow only lowercase letters and numbers in usernames.
- Treat soft-deleted PatchHub users as blocked, not as users who need setup.
- Keep app authorization in the PatchHub database. WorkOS is the authentication/session provider for
  this pass.

## Non-Goals

- Do not implement organization-owned project authorization in this pass.
- Do not add WorkOS metadata beyond `externalId`.
- Do not move favorite, project, or patch-note authorization into WorkOS.
- Do not replace root layout server load with remote functions.
- Do not introduce a root auth context unless a real prop-drilling problem appears during
  implementation.

## Agent Handoff

- Current status: Implementation complete. Auth server helpers are colocated under
  `src/lib/server/auth`, username setup is normalized/lowercase-only, deleted internal users are
  blocked through `/auth/error`, and WorkOS setup repair writes only `externalId`.
- Next action: None for this plan.
- Blockers: None.
- Latest validation: `npm run validate` passed on 2026-06-16.

## Scope

- `src/hooks.server.ts`
- `src/lib/remote/auth.remote.ts`
- `src/lib/server/auth/AuthContext.ts`
- `src/lib/server/auth/returnTo.ts`
- `src/lib/server/auth/*` for colocated auth helpers/services
- `src/lib/server/UserService.ts` and `src/lib/server/WorkOSClient.ts`, likely moved under
  `src/lib/server/auth/`
- `src/routes/+layout.server.ts`
- `src/routes/auth/error/+page.svelte`
- `src/routes/auth/setup/+page.server.ts`
- `src/routes/auth/setup/+page.svelte`
- `src/routes/profile/+page.server.ts`
- `src/routes/settings/+page.server.ts`
- `tests/*Auth*.test.ts` and focused service tests as needed

## Invariants

- Unauthenticated users can browse public pages.
- Authenticated users without an active PatchHub user row are sent to `/auth/setup`.
- Authenticated users with a soft-deleted PatchHub user row are blocked and are not sent through
  setup.
- WorkOS session state remains owned by the WorkOS AuthKit SvelteKit adapter.
- PatchHub user lookup is based on `user.authProviderId = workosUser.id`.
- WorkOS `externalId` is best-effort correlation only. PatchHub must continue to work if it is
  missing or temporarily fails to update.
- Server-only WorkOS and DB code stays out of client components.
- New Svelte components use Svelte 5 runes patterns and pass the Svelte autofixer.
- Auth error UI uses existing common UI components and DaisyUI semantic classes, avoiding bespoke
  spacing and custom styling.
- `npm run validate` must pass before the implementation is considered complete.

## Work Items

- [x] Colocate auth server code under `src/lib/server/auth/`.
  - Move WorkOS client wrapper into the auth folder.
  - Move or split user lookup/provisioning helpers into the auth folder if they are only used for
    auth.
  - Keep `src/lib/remote/auth.remote.ts` with the remote functions, per project convention.
  - Remove redundant auth indirection where possible, such as calling `authKit.getUser(event)` after
    the AuthKit hook has already populated `event.locals.auth.user`.
  - Avoid extra wrapper layers; prefer a small number of clearly named functions.
- [x] Normalize username handling.
  - Add a single username normalization/validation helper.
  - Trim and lowercase usernames before uniqueness checks and insert.
  - Restrict usernames to lowercase letters and numbers only.
  - Update setup form copy/validation messages.
  - Add tests for normalization, invalid characters, uppercase input, and duplicate usernames.
- [x] Harden user lookup and deleted-user handling.
  - Make active-user lookup exclude `deletedAt`.
  - Add a way to distinguish missing internal user from soft-deleted internal user.
  - Update `requireInternalUser` and provisioning hook behavior so deleted users get a blocked
    response instead of setup.
  - Add `/auth/error` to the auth/provisioning bypass list so blocked users can see the error page.
  - Prefer `error(403, ...)` or a redirect to `/auth/error?code=account_disabled`; avoid loops.
  - Avoid catching infrastructure errors and redirecting them to setup.
- [x] Remove WorkOS username metadata writes.
  - Update account setup to set only `externalId`.
  - Make `externalId` update best-effort or repairable so DB user creation is not undone by a
    transient WorkOS API failure.
  - Log enough server context to repair `externalId` without exposing secrets.
- [x] Add a simple `/auth/error` page.
  - Use existing common UI components first, then DaisyUI components/classes.
  - Keep the page concise: explain that sign-in could not be completed and provide a sign-in retry
    link plus a home link.
  - Handle known query codes such as callback failure and account disabled without exposing internal
    error details.
  - Use semantic DaisyUI classes such as `alert`, `btn`, `btn-primary`, `btn-ghost`,
    `bg-base-100`, and `text-base-content`.
- [x] Review root auth display data.
  - Keep `src/routes/+layout.server.ts` as the source for root `data.user`.
  - Ensure the returned layout user shape contains only UI-safe fields.
  - Prefer WorkOS email/name/profile-picture fields for identity display and PatchHub DB for
    username.
- [x] Add focused tests.
  - Username normalization and uniqueness.
  - Active vs soft-deleted user lookup.
  - Setup account updates only WorkOS `externalId`, not metadata.
  - Provisioning hook redirects missing internal users to setup.
  - Provisioning hook blocks deleted internal users.
  - Auth return/error behavior where practical without over-mocking the WorkOS SDK.

## Future Org Auth Plan

Handle organization auth as a separate implementation plan after personal auth is stable.

- Add a local `organization_member` table before enabling org-owned workflows.
- Treat WorkOS organization membership as upstream identity/membership lifecycle data, not as the
  per-request app authorization source.
- Sync or repair local organization and membership rows during login, organization switch, webhook
  handling, and explicit refresh flows.
- Store WorkOS ids as provider ids on local organization and membership rows.
- Keep PatchHub-specific roles and authorization checks local.
- Add WorkOS webhook endpoints only as real HTTP boundaries, not remote functions.
- Add an organization switch route/action that uses `authKit.switchOrganization`, then refreshes or
  repairs local membership data.
- Gate org-owned project creation/editing from local membership rows.
- Update navigation only after local memberships exist, so UI and authorization agree.

## Validation

- [x] Format touched files with targeted Prettier.
- [x] Run Svelte autofixer on edited `.svelte` files.
- [x] Run focused unit tests for auth/user helpers:
      `npm run test:unit -- --run tests/auth/AuthReturnTo.test.ts tests/auth/AuthUsernames.test.ts tests/auth/AuthUsers.test.ts tests/auth/AuthProvisioning.test.ts tests/auth/AuthWorkOSUserUpdates.test.ts`.
- [x] Run `npm run validate`.
- [x] Browser smoke-check `/auth/error?code=account_disabled` at desktop and 375px mobile widths;
      auth error content and links rendered, and horizontal overflow was cleared with a small responsive
      navbar adjustment.

## Notes

- Current `.env` is ignored and not tracked.
- The installed `@workos/authkit-sveltekit` package is current at `0.3.0` as of this audit.
- WorkOS callback failures from the adapter can redirect to `/auth/error?code=...`; adding the page
  closes that route gap.
