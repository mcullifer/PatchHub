# Auth and Organization Architecture

PatchHub uses WorkOS for authentication and identity lifecycle, while keeping app-owned
authorization and product data in the PatchHub database.

## Ownership Boundary

- WorkOS owns sign-in, sessions, identity provider details, and hosted auth flows.
- WorkOS can own organization membership lifecycle concerns such as invitations, SSO, and
  directory-backed membership.
- PatchHub owns internal users, usernames, favorites, project ownership, app roles, and
  authorization decisions.
- PatchHub should not store sensitive auth data in WorkOS metadata.
- WorkOS `externalId` may mirror the PatchHub internal user id as a fast-path hint, but the
  PatchHub database remains the source of truth for app user state.

## Personal Accounts and Organizations

PatchHub should support a GitHub-like ownership model:

- Every signed-in person has a personal PatchHub user account.
- Users may belong to zero, one, or many organizations.
- Projects may belong to either a personal user account or an organization.
- A project should have exactly one owner: either `project.userId` or `project.orgId`.

The existing `organization` table can represent PatchHub organizations backed by WorkOS
organizations through `organization.authProviderId`.

## Memberships

PatchHub should add an app-owned organization membership table before enabling org-owned
project workflows. WorkOS may be the upstream source for membership lifecycle, but PatchHub
needs local membership rows for fast and reliable app authorization.

Suggested shape:

```ts
organizationMember {
	id
	organizationId
	userId
	role // owner | admin | member
	authProviderMembershipId // optional WorkOS membership id
	authProviderRoleSlug // optional WorkOS role slug
	lastSyncedAt
	createdAt
	updatedAt
}
```

Use PatchHub membership rows when answering app questions such as:

- Can this user create a project in this organization?
- Can this user edit this organization-owned project?
- Which organizations should appear in navigation?
- What PatchHub-specific role does this user have?

WorkOS should not need to be called on every authorization check. Sync or repair local
membership state during login, organization selection, webhook handling, or explicit refresh
flows.
