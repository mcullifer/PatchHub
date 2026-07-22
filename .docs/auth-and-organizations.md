# Auth and Organization Architecture

## Current State

- WorkOS AuthKit owns login, sessions, identity-provider data, and hosted authentication flows.
- Convex owns PatchHub users, usernames, favorites, projects, posts, and authorization decisions.
- `users.authProviderId` connects a PatchHub user to WorkOS.
- `users.platformRole` is global PatchHub access (`member` or `admin`), not an organization role.
- New projects are currently personal projects. Project writes authorize against `project.userId`.
- The `organizations` table, `projects.orgId`, and organization route lookup are scaffolding.
  Organization membership and org-owned write flows are not implemented.

The Convex database is the source of truth for PatchHub product state. Do not trust client-provided
user or organization ids, and do not store PatchHub authorization state in WorkOS user metadata.

## Request Authorization

- Use `requireAuth(event)` for a cheap WorkOS session precheck in SvelteKit. It reads the session
  already present in `event.locals` and does not call Convex.
- Use `getAuthContext(event)` only when SvelteKit needs the PatchHub user record or provisioning
  status. Its Convex lookup is cached for the lifetime of the request.
- Remote functions authenticate their Convex client with the current WorkOS access-token JWT.
- Layout data exposes the current Convex user id. Read DTOs expose resource owner ids, and Svelte
  derives UI visibility by comparing them. Convex ids are identifiers, not authorization proof.
- Convex reads use `ctx.auth.getUserIdentity()` only when authentication changes which data may be
  returned. Convex writes use `requireActiveUser` and re-check resource ownership.
- Keep the shared server secret for service-only operations without an end-user identity, such as
  cache, catalog sync, and protected server metadata reads.

## Organizations

Before enabling organization-owned project writes, add app-owned membership records and explicit
role checks. WorkOS may provide membership lifecycle events, but PatchHub still needs local
membership state for reliable authorization.

The intended ownership invariant is that a project has exactly one owner: `userId` or `orgId`,
never both. Enforce that invariant in mutations before exposing organization project creation or
editing.
