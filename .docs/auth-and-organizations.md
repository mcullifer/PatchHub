# Auth and Organization Architecture

## Current State

- WorkOS AuthKit owns login, sessions, identity-provider data, and hosted authentication flows.
- Convex owns PatchHub users, usernames, favorites, projects, posts, and authorization decisions.
- `users.authProviderId` connects a PatchHub user to WorkOS.
- `users.platformRole` is global PatchHub access (`member` or `admin`), not an organization role.
- New projects are currently personal projects. Project writes authorize against `project.userId`.
- The `organizations` table, `projects.orgId`, organization route lookup, and WorkOS
  `organizationId` in `AuthContext` are scaffolding. Organization membership and org-owned write
  flows are not implemented.

The Convex database is the source of truth for PatchHub product state. Do not trust client-provided
user or organization ids, and do not store PatchHub authorization state in WorkOS user metadata.

## Request Authorization

- Build request identity through `getAuthContext(event)`.
- Use `requireAuth` when a WorkOS session is sufficient.
- Use `requireInternalUser` for PatchHub reads or writes that require an active Convex user.
- Remote functions derive the current user from the request and pass the trusted WorkOS id through
  the server-to-Convex boundary.
- Convex mutations verify the server secret and re-check resource ownership.

## Organizations

Before enabling organization-owned project writes, add app-owned membership records and explicit
role checks. WorkOS may provide membership lifecycle events, but PatchHub still needs local
membership state for reliable authorization.

The intended ownership invariant is that a project has exactly one owner: `userId` or `orgId`,
never both. Enforce that invariant in mutations before exposing organization project creation or
editing.
