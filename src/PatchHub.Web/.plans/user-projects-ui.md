# Plan: User Projects & Patch Notes UI

Design spec for the `[createdBy]` profile page and `[createdBy]/[project]` patch-note
pages. Implementation: codex (gpt-5.5). Review: Claude opus (conventions + UI fidelity).
Backend contract: see `src/convex/projects.ts`, `src/convex/patchNotes.ts`,
`src/lib/remote/projects.remote.ts`, `src/lib/remote/patchNotes.remote.ts` (built to a
frozen contract; read the actual files for exact shapes).

## Coding rules (hard requirements)

- daisyUI components/classes first; no custom CSS unless a spec line below says so.
- Svelte 5 runes only. `$effect` is a last resort: prefer `$derived`, attachments,
  event handlers. NO state assignments inside `$effect`.
- NO narration comments. Comments only for non-obvious constraints. Match the sparse
  comment density of the existing codebase.
- Optimize for developer experience: clean prop/function shapes, obvious naming, no
  needless indirection. Leverage Svelte 5 features (runes, snippets, attachments,
  instance exports) wherever they simplify. Elegant and terse beats defensive and
  verbose.
- Visual polish beyond this spec is explicitly out of scope — a dedicated design pass
  happens later. Implement the spec, don't decorate.
- Follow `.docs/svelte-guidelines.md`, `.docs/style-guidelines.md`,
  `.docs/remote-functions-guidelines.md`.
- Reuse existing components: `EmptyState`, `Icon`, `Button` from
  `$lib/components/common-ui`; `TipTap` from `$lib/components/wysiwyg/TipTap.svelte`.
- Server loads follow the existing pattern in `src/routes/[createdBy]/[project]/+page.server.ts`
  (convex query via `$lib/server/convex`, `error(404)` on null).
- Auth in loads: `getAuthContext(event)` from `$lib/server/auth/AuthContext`.
  `isOwner` = `dbUser?.username === normalizeUsername(params.createdBy)`
  (`normalizeUsername` from `$convex/lib/usernames`).
- Mobile: x-padding is precious; every page must be clean at 375px. No horizontal
  scroll. No native `<select>` anywhere.

## 1. Profile page — `src/routes/[createdBy]/+page.server.ts` + `+page.svelte`

Load: `api.projects.getOwnerProfile({ createdBy })` → 404 if null. Return
`{ profile, isOwner }`.

Layout (mirror `src/routes/profile/+page.svelte` conventions):

```
<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
```

- **Header row**: avatar placeholder (`avatar avatar-placeholder`, `bg-base-200`
  `w-16 rounded-box`, content = first letter of name, uppercase, `text-2xl`), then
  `h1` name (`text-2xl font-bold truncate`) + `Joined <month year>` in
  `text-base-content/60 text-sm` (from `profile.owner.createdAt`).
- **Projects section**: heading row — `h2` "Projects" (`text-lg font-semibold`) +
  count in `text-base-content/60`; owner-only right-aligned button:
  `btn btn-primary btn-sm` with `Icon icon="add" size="sm"` + "New project", opens the
  modal below.
- **Project list**: `<ul class="border-base-content/10 divide-base-content/10 divide-y rounded-box border">`;
  each `<li>` a `p-4` row: project name as `<a>` (`link link-hover font-semibold`,
  href `/{createdBy}/{slug}`), description `text-base-content/70 text-sm` (omit el if
  none), right-aligned `Updated <relative-ish date>` `text-base-content/50 text-xs`
  (use `toLocaleDateString`, no date lib). Rows stack cleanly at 375px (flex-col on
  mobile, `sm:flex-row sm:items-center sm:justify-between`).
- **Empty states** (`EmptyState` component):
  - Owner: `icon="rocket_launch"`, title "Create your first project", description
    "Projects hold the patch notes you publish for your users.", children = the same
    New-project button.
  - Visitor: `icon="folder_open"`, title "No projects yet",
    description "{name} hasn't created any projects."
- **New Project modal**: native daisyUI `<dialog class="modal modal-bottom sm:modal-middle">`.
  Form uses the `createProject` remote form function (progressive enhancement per
  remote-functions guidelines — spread its form props, use its field issues for
  errors). Fields: Name — `input w-full`, required, maxlength 100, label via
  `fieldset` daisyUI form conventions; Description — `textarea w-full`, maxlength 500,
  optional. Field errors: `text-error text-sm` under the field. Actions:
  Cancel (`btn btn-ghost`, closes dialog) + Create (`btn btn-primary`, pending spinner
  `loading loading-spinner loading-sm` while submitting, label stays). Server redirects
  to the new project page on success.
- `<svelte:head><title>{name} - PatchHub</title></svelte:head>`

## 2. Project page — rework `src/routes/[createdBy]/[project]/+page.server.ts` + `+page.svelte`

Load: `api.patchNotes.listByOwnerAndProject({ createdBy, projectSlug, ...(workosUser ? { secret, authProviderId } : {}) })`
→ 404 if null. Return `{ project, notes, isOwner: project.isOwner }`. (Replaces the
current `projects.getByOwnerAndSlug` load + placeholder page.)

- **Breadcrumbs**: daisyUI `breadcrumbs text-sm`: `{createdBy}` → project name.
- **Header**: `h1` project name (`text-2xl font-bold`), description
  `text-base-content/70`, owner-only `btn btn-primary btn-sm` "New patch note"
  (`Icon icon="edit_square"`) linking `./new` — `resolve()` from `$app/paths` for hrefs.
- **Notes index**: a compact selector alongside a selected-note reading surface. The list DTO stays
  free of note body content; the selected note is fetched through the single-note query, while the
  standalone note route remains available for direct links.
- **Empty states**:
  - Owner: `icon="history_edu"`, title "Write your first patch note", description
    "Publish updates so your users know what changed.", children = New-patch-note
    button (same link).
  - Visitor: `icon="notes"`, title "No patch notes yet".

## 3. New patch note — `src/routes/[createdBy]/[project]/new/+page.server.ts` + `+page.svelte`

Load: resolve project via the same list query (or `projects.getByOwnerAndSlug`) +
`getAuthContext`; `error(404)` unless `isOwner`. Return `{ project }` (id, name, slug).

- Breadcrumbs: `{createdBy}` → project → "New patch note".
- Title field: `input input-lg w-full font-semibold` placeholder "Title", maxlength 150,
  bound with `$state`.
- Editor: `<TipTap bind:this={editor} placeholder="Write your patch notes…" />`
  (editable default). Instance typed `let editor = $state<TipTap | null>(null)`
  — call `editor.getPayload()`.
- Action bar (sticky bottom on mobile is NOT required; simple row under editor,
  right-aligned): "Save draft" `btn btn-soft` + "Publish" `btn btn-primary`. Click →
  validate: title non-empty (else `input-error` + `text-error` hint), payload
  non-null && !isEmpty (else `alert alert-warning` "Write something first"); then
  `createPatchNote({ projectId, title, content: JSON.stringify(payload.json), status })`
  and `goto(resolve('/{createdBy}/{project}/{slug}'))` (publish) or back to the project
  page (draft). Both buttons disabled + spinner on the clicked one while pending.
  Failure: `alert alert-error` with the error message, buttons re-enabled.

## 4. Note view — `src/routes/[createdBy]/[project]/[note]/+page.server.ts` + `+page.svelte`

Load: `api.patchNotes.getByOwnerProjectAndSlug({ createdBy, projectSlug, noteSlug, ...auth })`
→ 404 if null. Return `{ project, note, isOwner }`.

- Breadcrumbs: `{createdBy}` → project → note title (truncated).
- `h1` title, meta row (date + Draft badge like the feed).
- Body: read-only TipTap with the parse-failure fallback.
- `<svelte:head>` title: `{note.title} - {project.name}`.

## Verification expectations for the implementer

Targeted only: `npx prettier --write` touched files, svelte-autofixer on every
component, `npx svelte-check` filtered to the new/changed routes. Do NOT run
`npm run validate` (concurrent agents). Interactive auth-dependent verification is
handled by the orchestrator afterward.

## Review follow-up — 2026-07-09

- Kept owner-profile page reads on a validated Svelte remote query, with the remote handler
  composing Convex data and server-only WorkOS profile data.
- Kept WorkOS provider ids out of the public Convex profile result.
- Missing or unavailable WorkOS users now fall back to the owner initial instead of turning a
  valid PatchHub profile into a 404. This preserves the database-only `patchhubdemo` profile.
- Refined the profile identity surface and project list with the existing `Card`, `EmptyState`, and
  `Icon` components plus daisyUI avatar, badge, list, button, modal, and form classes.
- Each project row is now one full-width link with responsive metadata and a clear navigation
  affordance.
- Browser verification covered the WorkOS-backed `/max` profile, database-only `/patchhubdemo`,
  project navigation, and the new-project modal.
- `npm run validate` passed with 121 tests after the profile, project, and note redesigns on
  2026-07-09.
- Kept patch-note list DTOs free of body content and preserved the standalone note route as a
  `Card` reading surface with status/date metadata.
- Prevented read-only TipTap transactions from updating toolbar-only reactive state; normal reloads
  and `svelte-kit sync` no longer trigger the previous update-depth runtime failure on note pages.

## Project banner hero continuation — 2026-07-09

Goal: give user-created project detail pages the Steam feed hero language and let project owners
set or replace a banner without leaking Convex storage mechanics into UI components.

Invariants:

- Public and database-only owners such as `patchhubdemo` continue to render without WorkOS data.
- App-internal reads and writes remain behind validated Svelte remote functions.
- Only a provisioned owner can request an upload URL or attach a banner to an existing project.
- Replacing a banner deletes the previously referenced storage object.
- Project UI DTOs contain a resolved `bannerUrl`, never the `_storage` id.

Completed:

- Added an optional project banner storage reference and resolved banner URL in project patch-note
  DTOs.
- Added server-side MIME, size, and file-signature validation for JPEG, PNG, WebP, GIF, and AVIF
  banners up to 5 MB.
- Added an optional banner field to the existing new-project modal. The file is validated and
  uploaded before project creation, with best-effort cleanup if creation fails.
- Added owner-authorized upload URL and attach mutations. Replacement updates the project and
  deletes its old banner in the same Convex mutation.
- Made failed-upload cleanup attachment-aware so an interrupted response cannot delete a banner
  that was already attached successfully.
- Reused `UpdateFeedHero` for project pages, with a generic optional actions snippet for the
  owner-only replacement form.
- Added a shared project layout that owns the route-aware breadcrumb, max width, and
  `py-4 sm:py-6` page gutter. Its remote reads deduplicate with the child page reads, and the
  project, note, and new-note routes now inherit an identical breadcrumb position.
- Matched the Steam detail route's substantial `max-w-7xl` frame and responsive horizontal
  padding for the project hero and note index. Note reading and authoring surfaces remain centered
  at `max-w-4xl` inside that shared frame.
- Matched the rest of the Steam feed composition with a sticky desktop patch-note selector, mobile
  dropdown, and selected-note reading surface. The newest list item is selected automatically, and
  only that note's content is fetched through the existing single-note remote query.
- Extracted the project-specific UI into `ProjectHero` and `ProjectPostFeed`; the route now only
  loads its DTO and composes those components over the existing generic update-feed primitives.
- Tightened the project feed spacing to `gap-3 sm:gap-4` after browser review.
- Captured the owner slug in the resolved layout breadcrumb DTO so the owner link also renders on
  a direct page load or hard refresh, not only after client navigation.
- Moved the stray `src/demo.spec.ts` test under `tests/demo/`; non-Convex banner tests live under
  `tests/projects/`.

Validation:

- Targeted banner and Convex tests: passed (36 tests across the selected files).
- Svelte autofixer: no issues in edited components; the pre-existing dialog `bind:this` receives
  only the generic attachment suggestion.
- Browser: verified the public `patchhubdemo` project on 1440×900 and 375×812 with no horizontal
  overflow, no console warnings/errors, compact spacing, and no owner controls for visitors.
  Direct project and note loads both render the owner link and place the breadcrumb at the same
  88px desktop top position. At 1280px, both Steam and user-project heroes render at 1232px wide;
  the 375px project view remains free of horizontal overflow.
- Convex development functions: synced successfully after the finalized storage cleanup contract.
- `npm run validate`: passed with 132 tests.
