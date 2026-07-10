# Plan: TipTap WYSIWYG Editor UX Overhaul (Notion/Coda bar)

## Goal

Make `src/lib/components/wysiwyg/TipTap.svelte` feel like a polished block editor
(Notion/Coda reference): correct + elegant drag handle, selection bubble menu, slash
command menu, slim responsive toolbar, tight content spacing, and a clean read-only
mode that will render published patch notes for visitors. Editable and read-only modes
are equally important.

## Non-Goals

- Lexical.svelte / LexicalTheme.ts (legacy experiment — do not touch).
- Collaboration, mentions, tables, file upload, image hosting.
- Any changes to `src/convex/**`, `src/lib/remote/**`, `src/lib/components/common-ui/**`
  (other agents own these; **read-only** access to `common-ui` is fine and expected).
- `npm run validate` full runs (concurrent agents; use targeted checks only).

## Agent Handoff

- Current status: Diagnosis complete (browser-verified, 2026-07-08). Demo playground
  page rewritten and verified working. No production editor code changed yet.
- Next action: Execute chunks 1–8 below, in dependency order.
- Blockers: none.
- Latest validation: dev server boots, `/demo` renders both instances, save→published
  round-trip works, zero console errors/warnings.

### Work already done in the diagnosis session (state: complete, keep)

- `src/routes/demo/+page.svelte` — rewritten from a stale `/demo/lucia` link into the
  editor playground (spec in Chunk 1; already implemented and browser-verified:
  renders, Editable toggle works, Save updates the read-only pane through a
  stringify→parse round trip). Treat as done unless a chunk below says otherwise.
- `package.json` / `package-lock.json` — added `@tiptap/suggestion@3.27.1`
  (**exact** version; tiptap pins exact peers, `^` ranges fail to resolve).
  `@tiptap/extension-bubble-menu` was deliberately NOT added — the bubble menu must be
  built on the in-repo floating toolkit instead (user requirement).

## Scope (file ownership)

- `src/lib/components/wysiwyg/TipTap.svelte` (rework)
- `src/lib/components/wysiwyg/TipTapToolbar.svelte` (rework)
- `src/lib/components/wysiwyg/TipTapTypes.ts` (extend)
- `src/lib/components/wysiwyg/TipTapBubbleMenu.svelte` (new)
- `src/lib/components/wysiwyg/TipTapSlashMenu.svelte` (new)
- `src/lib/components/wysiwyg/slashCommand.ts` (new)
- `src/lib/components/wysiwyg/TipTapImageDialog.svelte` (new)
- `src/routes/demo/+page.svelte` (done; small tweaks allowed)
- `package.json` only if a dep is unavoidable (see Dependency policy)

## Invariants (FROZEN — a concurrent page-building agent consumes these)

1. Props of `TipTap.svelte` stay exactly: `content?: TipTapContent`,
   `editable?: boolean` (default `true`), `placeholder?: string`,
   `onsave?: (content: TipTapSavePayload) => void | Promise<void>`.
2. New instance export on `TipTap.svelte`:
   ```ts
   export function getPayload(): TipTapSavePayload | null; // null while editor not mounted
   ```
   Returns `{ json: editor.getJSON(), html: editor.getHTML(), text: editor.getText(), isEmpty: editor.isEmpty }`.
   The toolbar Save button must go through this same function (single source of truth).
3. `editable={false}` cleanly renders a stringified-then-parsed TipTap JSON doc passed
   as `content` (verified working today; must not regress).
4. Module exports `TipTapContent`, `TipTapJsonContent`, `TipTapSavePayload` remain.
5. `editable` can flip at runtime (demo toggle relies on it; verified working today).

---

## Diagnosis findings (all browser-verified on /demo unless noted)

### F1. Drag handle — root causes (the "known bug")

The DragHandle plugin (`@tiptap/extension-drag-handle@3.27.1`) appends a 0×0 wrapper
div (`position:absolute; top:0; left:0`) to `editor.view.dom.parentElement` and
positions the handle with floating-ui using the `absolute` strategy. Today
**no ancestor of the editor is positioned**, so the wrapper anchors to the document.
Consequences and co-bugs:

- **F1a — stale-handle horizontal overflow (mobile killer).** The plugin hides the
  handle with `visibility:hidden`, never `display:none`, and leaves the last
  document-absolute `left/top` inline. After a viewport resize (1280→375) the hidden
  handle sat at x≈678–702 → `document.scrollWidth` 702 on a 375px viewport → the whole
  page pans horizontally on mobile. Repro: desktop width, hover a paragraph, resize to
  375, measure `document.documentElement.scrollWidth`.
- **F1b — list items retarget wrongly.** Hovering the first `<li>` (10px below its top
  edge, inside the configured `nested.edgeDetection.threshold: 18`) left the handle
  anchored to the _previous_ h2; hovering the nested `<li>` anchored the handle to the
  _parent_ li (measured deltas: y −56 and −40). Plain blocks (p, h1, h2, blockquote,
  pre, hr) align perfectly (delta x −24, y 0), so the bug is specific to the `nested`
  edge-detection config.
- **F1c — image offset 32px.** Tiptap v3 Image-with-resize renders
  `<div data-resize-wrapper>` (margin 0) around the `<img>`, but `prose` puts the
  32px block margins on the `img` itself. The handle anchors to the wrapper → floats
  32px above the visible image. Same root cause misplaces the 4 resize-handle bars
  (positioned at wrapper edges, i.e. 32px above/below the visible image edges).
- **F1d — cosmetics.** Handle touches the text with **zero gap** (24px-wide handle at
  exactly x = blockLeft − 24); `cursor: pointer` instead of grab/grabbing; glyph
  renders at 11px (btn-xs font-size shrinks the Material Symbols glyph); on mobile the
  handle (left: 8) pokes 8px past the editor container into the page gutter.
- **F1e — read-only instance still registers the whole plugin** (hidden but present:
  wrapper div, mousemove hit-testing on every pointer move).
- **F1f — orphaned handle on content change.** After `clearContent()` the handle stays
  visible floating in the empty editor (plugin only hides on mouseleave/keydown).
- NOT broken: document-scroll compensation (floating-ui converts correctly), plain
  block alignment, hide-on-keydown, hide-while-read-only visibility flag.

### F2. Spacing — the app.css override block is dead CSS

`app.css` has `.patchhub-rich-text.patchhub-rich-text :where(p) {...}` etc. in
`@layer components`, but `prose` is a **utilities-layer** class in Tailwind v4 —
utilities beat components regardless of specificity. Every override silently loses.
Measured computed values in the editor today (raw `prose` defaults): p margin-block
20px; h2 margin-top **48px**; hr margin-block **48px each side**; img margin-block
32px; blockquote 25.6px; `li > p` mt 20px / mb 12px (makes list items 68px tall);
p line-height 28px (1.75). This is the "too much vertical spacing" complaint.
Also from prose: inline `code` gets literal backtick `::before/::after` pseudo-content,
`blockquote` gets open/close quotation-mark pseudo-content + italics.

### F3. Placeholder never renders

`Placeholder.configure({ showOnlyCurrent: false })` switches the v3 placeholder to a
viewport-windowed code path (`PLUGIN_KEY` state `topPos/bottomPos`); that state is
stuck at `{topPos: 0, bottomPos: 0}` in this app → `nodesBetween(0,0)` → **zero
decorations, ever**. Verified: empty doc, focused, no `data-placeholder`, no
`is-editor-empty` class. Fix: use `showOnlyCurrent: true` (default; anchor-resolved
path, no viewport state) — which is also the Notion behavior.

### F4. Read-only mode leaks editing chrome

- Keeps `min-h-80` (320px min-height) and `px-6 py-5` padding baked into
  `editorProps.attributes` → published short posts get a big empty box.
- Renders all 4 image `[data-resize-handle]` divs in the DOM (interaction untested —
  see Pending codex items).
- Registers drag-handle plugin + wrapper (F1e).
- `Link.configure({ openOnClick: false })` disables link clicks in read-only too —
  visitors can't follow links. v3 supports `openOnClick: 'whenNotEditable'`.

### F5. Toolbar / interaction quirks

- Link and image insert use `window.prompt` (blocking, unstyled, janky).
- Active toolbar buttons use solid `btn-primary` fill — heavy, not Notion-quiet.
- Mobile (375px): toolbar wraps into **4 rows** (128px tall).
- Editable editor surface has no visible boundary at all (container `bg-base-100` on a
  `base-100` page — invisible edge, no focus treatment).
- No bubble menu, no slash menu ("/" types a literal slash).
- Block-format `<select>` is native (fine per se, but restyle target below).
- Selection: no visual selection once the editor blurs (matters for link editing UX).
- Tab/Shift-Tab already sink/lift list items (extension-list keymaps — works, keep).
- StarterKit v3 already includes TrailingNode, Underline, Link (link disabled in favor
  of the custom-configured one), UndoRedo, Dropcursor, Gapcursor.
- Demo page save flow, editable toggle, error-free console: verified good.

### F6. Useful discoveries for the design

- `@tiptap/extensions` (already installed, ships with StarterKit) exports a
  **`Selection`** extension: keeps the selection visibly decorated (`.selection` class)
  while the editor is blurred — exactly what the bubble-menu link input needs.
- The in-repo floating toolkit (`src/lib/components/common-ui/floating/`) is fully
  sufficient for bubble + slash menus: `createFloating` accepts **virtual elements**
  (`setReference({ getBoundingClientRect })`), uses `autoUpdate`, exposes
  `reference()/floating()` attachment props, plus `useDismiss`, `Portal`, `Dropdown`,
  `Tooltip`. No `@tiptap/extension-bubble-menu` / `floating-menu` needed.
- `posToDOMRect(view, from, to)` is exported by `@tiptap/core` for selection rects.
- tiptap deps must be pinned **exact** (`3.27.1`), not `^`.

### NEEDS INTERACTIVE VERIFICATION (real pointer — the diagnosis session's codex

computer-use run failed and was abandoned; all findings above were established with
synthetic events + computed-style measurement. The items below are UNVERIFIED and are
explicit acceptance criteria on Chunks 2, 3, 6, 8)

- Does drag-to-reorder actually complete a drop (drag preview, dropcursor, block moves)?
- Real-pointer hover reveal fidelity vs the synthetic findings above (incl. list/image
  retargeting F1b/F1c reproduced with a real mouse).
- Image resize drag smoothness / aspect-ratio hold; whether read-only resize handles
  are interactive or inert.
- Link single-click behavior inside the editable editor.
- Mobile touch behavior (tap selection → bubble menu, slash menu with on-screen
  keyboard) on a real ~375px viewport.

---

## Design spec

### D1. Content spacing (Notion-density prose)

Implement inside `TipTap.svelte`'s `<style>` block as **unlayered** `:global` rules
(unlayered CSS beats Tailwind's utilities layer — this is why it works where app.css
failed). Scope everything under `.tiptap-editor`. Keep the `prose prose-sm
sm:prose-base` base for typography (weights, sizes, link styling) and override rhythm:

| Element                            | Rule                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p`                                | `margin: 0 0 0.5rem; line-height: 1.6;`                                                                                                                                                                                                                 |
| `h1`                               | `margin: 1.5rem 0 0.5rem;`                                                                                                                                                                                                                              |
| `h2`                               | `margin: 1.25rem 0 0.375rem;`                                                                                                                                                                                                                           |
| `h3`                               | `margin: 1rem 0 0.25rem;`                                                                                                                                                                                                                               |
| `ul, ol`                           | `margin: 0.5rem 0; padding-inline-start: 1.375rem;`                                                                                                                                                                                                     |
| nested `ul, ol`                    | `margin: 0.125rem 0;`                                                                                                                                                                                                                                   |
| `li`                               | `margin: 0.125rem 0;`                                                                                                                                                                                                                                   |
| `li > p`                           | `margin: 0;`                                                                                                                                                                                                                                            |
| `blockquote`                       | `margin: 0.75rem 0; font-style: normal;` and kill prose quote pseudo-elements (`blockquote p::before/::after { content: none }`) — keep the existing left border                                                                                        |
| `pre`                              | `margin: 0.75rem 0; padding: 0.75rem 1rem;` keep `bg-base-300`-equivalent + `rounded-box`                                                                                                                                                               |
| inline `code`                      | kill backticks (`code::before/::after { content: none }`); style as pill: `background: color-mix(in oklch, var(--color-base-content) 8%, transparent); padding: 0.125rem 0.375rem; border-radius: var(--radius-selector, 0.25rem); font-size: 0.875em;` |
| `[data-resize-wrapper]`            | `margin: 0.75rem 0;`                                                                                                                                                                                                                                    |
| `[data-resize-wrapper] img`, `img` | `margin: 0;` (fixes F1c for handle AND resize bars)                                                                                                                                                                                                     |
| `hr`                               | `margin: 1.25rem 0;`                                                                                                                                                                                                                                    |
| first child                        | `margin-top: 0;` last child `margin-bottom: 0;`                                                                                                                                                                                                         |

Also delete the dead `.patchhub-rich-text` class from the editor's class string **only
if** a repo-wide grep shows no other consumer; the app.css block itself is out of scope
(app.css is shared — leave it, note it as dead in the PR description).

Acceptance: measured `getComputedStyle` margins match the table; the seeded /demo doc
visibly tightens (h2→content gap reads as one unit; the hr no longer creates a ~96px
void; list items are single-line-height apart); read-only pane matches the editor
rhythm exactly.

### D2. Control aesthetic (taste-critical — applies to toolbar, bubble, slash, handle)

- Surfaces: floating chrome = `bg-base-100 border border-base-content/20 rounded-box
shadow-lg p-1`. **CORRECTED (chunk 3, user review):** the border is
  `border-base-content/20`, NOT `border-base-300` — base-300 borders are nearly
  invisible against dark backgrounds, and floating chrome must read as a clearly
  separated surface above the page. Applies to bubble/slash/dropdown chrome. The (rare)
  solid contrast surface is `neutral` (tooltips already do this). Never raw palette
  colors.
- Buttons: `btn btn-soft btn-sm btn-square` in the bubble menu (touch-friendly 32px);
  icons via the common-ui `Icon` component, `size="sm"` (18px), Material Symbols names
  already in use (`format_bold`, etc.). **CORRECTED (chunk 3, user review):** bubble
  buttons use `btn-soft`, NOT plain `btn-ghost` — ghost buttons had no at-rest
  definition and were hard to see; soft gives a visible resting boundary while keeping
  icon glyphs at full `text-base-content` contrast. (The toolbar slim-down in chunk 5
  can adopt the same soft treatment.)
- **Active state (the signature look): quiet primary tint, not solid fill** —
  `bg-primary/20 text-primary` on top of `btn-soft` (replace today's
  `btn-primary text-primary-content`). **CORRECTED (chunk 3):** `/20` not `/10` — the
  tint must stay unmistakably distinct from `btn-soft`'s resting background in both
  light and dark. `aria-pressed` stays.
- Hover: default ghost hover only. Disabled: native `btn` disabled styling.
- Group separation inside bars: `<span class="w-px self-stretch bg-base-300 mx-1">`
  hairlines (not nested boxes, no `join` needed once buttons are ghost).
- Save is the single primary action on the surface: `btn btn-primary btn-sm` with the
  text label "Save" (+ spinner while saving, label stays to avoid width jump).
- Drag handle: `drag_indicator` glyph at explicit `font-size: 18px`,
  `text-base-content` at 40% opacity, 70% on hover, transparent→`base-content/10`
  hover bg, `border-radius: var(--radius-field)`, `cursor: grab` /
  `cursor: grabbing` while `[data-dragging="true"]`, fade in with a ~100ms opacity
  transition (no layout shift — it's absolutely positioned).
- Editable frame: container `rounded-box border border-base-300 bg-base-100`,
  `focus-within:border-base-content/25` (subtle, no primary ring). Read-only: **no
  frame, no background, no padding** — bare prose.
- Tooltips on icon-only buttons via existing `Tooltip` (already wired in the toolbar —
  keep pattern, content `bg-neutral text-neutral-content`).
- Motion: 100–150ms ease-out fades/scales max (Popover/Dropdown already use
  `scale` 150ms — match it). No bouncy transitions.

### D3. Drag handle behavior (fix F1)

Keep `@tiptap/extension-drag-handle` (positioning core is sound) with these changes in
`TipTap.svelte`:

1. Make the editor container (the div wrapping the ProseMirror mount) `position:
relative`. This re-anchors the plugin wrapper from the document to the container:
   kills the F1a document-level overflow class of bugs and makes stale coordinates
   harmless (container-relative).
2. `computePositionConfig: { placement: 'left-start', middleware: [offset({ mainAxis: 6, crossAxis: 2 })] }`
   (import `offset` from `@floating-ui/dom`) → 6px gap from text, optically centered
   on a 28px first line. Verify on h1 (40px line) — if it reads too high, that's fine
   (Notion does the same); do not per-block-tune.
3. Remove the `nested` option entirely (fixes F1b — the wrong-node targeting). Result:
   the handle targets top-level blocks only; a whole list drags as one block. This is
   the deliberate v1 trade-off (see Skipped). If, during verification, per-item
   handles turn out to work correctly with `nested` removed-vs-tuned, prefer whichever
   _aligns correctly_; correctness beats granularity.
4. Style per D2 (grab cursors, 18px glyph, opacity states) in `createDragHandle` +
   component CSS. Do NOT keep `btn btn-soft btn-xs` classes (11px glyph, pointer
   cursor).
5. Read-only + touch: container gets a `data-editable` attr; component CSS hides the
   handle wrapper entirely (`display: none`) when `[data-editable="false"]`, and under
   `@media (hover: none)` (F1e/mobile — hover UI is meaningless on touch; block
   reordering on touch is out of scope v1).
6. F1f orphan: on `editor.on('update')`, if doc changed structurally it already
   repositions; additionally dispatch `hideDragHandle` meta (the plugin supports a
   `hideDragHandle` transaction meta) when `editor.isEmpty` becomes true — cheap guard;
   verify the orphan repro from F1f is gone.
7. Image alignment comes free from D1's margin move (F1c).

Acceptance: hover each block type in /demo seed (h1, p, li, nested li, blockquote,
pre, image, hr) → handle appears within 150ms aligned with the hovered block's first
line, 6px left of content, never anchored to a different block; grabbing shows
`grabbing` cursor and drag-drop reorders the block with dropcursor feedback; after
narrowing the viewport to 375px, `document.documentElement.scrollWidth === 375`;
read-only pane never shows a handle; no layout shift on hover.

### D4. Selection bubble menu (new `TipTapBubbleMenu.svelte`)

Build on `createFloating` — no tiptap UI extension.

- Reference: virtual element `{ getBoundingClientRect: () => posToDOMRect(editor.view, from, to), contextElement: editor.view.dom }`
  (contextElement makes `autoUpdate` observe the right scroller). Update the reference
  on every `revision` change while open.
- Open condition (derive from `revision` + local pointer state):
  `editable && !selection.empty && !isNodeSelection && !editor.isActive('codeBlock') && !pointerDown && (editor.isFocused || focusInsideMenu)`.
  Track `pointerDown` with `pointerdown`/`pointerup` listeners on the editor dom +
  window (prevents the menu chasing a drag-selection; shows on mouseup — Notion
  behavior). Keyboard selections (shift+arrows) show it immediately.
- Positioning: `placement: 'top'`, middleware `[offset(8), flip(), shift({ padding: 8 })]`
  — `shift` is the mobile fit guarantee. Render through common-ui `Portal`.
- Content (one row, D2 styling): Bold, Italic, Underline, Strike, inline Code, hairline,
  Link. Active detection identical to today's toolbar `isActive` map.
- Link editing mode: clicking Link swaps the row for
  `input input-sm w-64` (prefilled with existing href via
  `editor.getAttributes('link').href`) + Apply (check icon) + Remove-link (link_off,
  only when a link exists) + Back. Enter applies, Escape cancels back to the buttons
  row. Reuse the URL normalization currently in `TipTapToolbar.svelte` — **move
  `normalizeUrl`/`hasAllowedProtocol` + their option types into `TipTapTypes.ts` (or a
  small `url.ts`)** so toolbar/bubble/dialog share one implementation. Apply via
  `chain().focus().extendMarkRange('link').setLink({ href })`, remove via
  `unsetLink()`.
- Register the `Selection` extension from `@tiptap/extensions` (F6) and style
  `.tiptap-editor .selection { background: color-mix(in oklch, var(--color-primary) 18%, transparent); }`
  so the selection stays visible while the link input has focus.
- Dismissal: selection collapse, Escape, `editor.on('blur')` unless focus moved into
  the menu (use `contains()` from the floating instance or a `focusout` check).
- Mobile: same component; `shift` keeps it on-screen; buttons are already 32px targets.
  Accept overlap quirks with the OS text-selection callout for v1 (document in report).

Acceptance: select text with mouse → menu appears on mouseup above the selection
(below via flip near the top edge); bold/italic states reflect and toggle live;
link flow add/edit/remove works without `window.prompt`; menu never overflows a 375px
viewport; zero appearances in read-only pane or while dragging a selection; selection
stays visibly highlighted during link editing.

### D5. Slash command menu (new `slashCommand.ts` + `TipTapSlashMenu.svelte`)

- `slashCommand.ts`: `Extension.create` wrapping `Suggestion` (from
  `@tiptap/suggestion`, installed) with `char: '/'`, `allowSpaces: false`,
  `startOfLine: false`, items filtered by query against label+keywords, and a `render`
  that forwards `onStart/onUpdate/onKeyDown/onExit` to callbacks injected via
  extension options. Command execution:
  `editor.chain().focus().deleteRange(range)` then the item's action.
- Items (order): Text, Heading 1, Heading 2, Heading 3, Bullet list, Numbered list,
  Quote, Code block, Divider, Image. Shape:
  `{ id, label, icon, keywords: string[], run(editor, range) }`. Image's `run` opens
  the shared image dialog (D6). Type these in `TipTapTypes.ts`.
- `TipTapSlashMenu.svelte`: exposes instance methods (`start(props)`, `update(props)`,
  `keydown(event): boolean`, `exit()`); `TipTap.svelte` binds the component instance
  and wires it into the extension options. Positioning via `createFloating` with the
  suggestion's `clientRect` as virtual reference; `placement: 'bottom-start'`,
  middleware `[offset(4), flip(), shift({ padding: 8 })]`; Portal to body.
- Markup: `menu menu-sm` inside a D2 floating surface, `w-56`,
  `max-height: min(18rem, 40vh)` + `overflow-y-auto` (40vh keeps it usable above an
  on-screen keyboard); each item = icon (`text-base-content/60`) + label; the
  keyboard-highlighted item gets `bg-base-200 rounded-field` (`menu` `active` class
  conventions are fine too — keep it one mechanism); highlighted item scrolls into
  view. Optional single `menu-title` "Blocks" — no more chrome than that.
- Keyboard: Up/Down wrap, Enter/Tab select, Escape closes and leaves the typed "/".
  Empty filter result → close the menu (so "/" + prose just types).
- Only register the extension's UI when editable (gate `onStart` on
  `editor.isEditable`).

Acceptance: typing "/" at start or mid-paragraph opens the menu at the caret; typing
filters ("he" → headings); arrows + Enter insert the right block and remove the "/query"
text; Escape restores plain typing; works at 375px with menu fully on-screen; menu
scrolls when taller than max-height; no menu in read-only.

### D6. Image URL dialog (new `TipTapImageDialog.svelte`)

daisyUI `modal` (native `<dialog>`, `modal-bottom sm:modal-middle`) owned by
`TipTap.svelte`; fields: URL (`input` + `validator` pattern for https), optional alt
text; Insert (`btn-primary`) / Cancel. Uses the shared `normalizeUrl` with
`http:/https:` allowlist + root-relative. Insert runs
`chain().focus().setImage({ src, alt })`. Used by both the toolbar image button and
the slash "Image" item (replaces both `window.prompt` flows; D4 replaces the link
prompt). Native dialog gives focus trap + Escape for free.

Acceptance: image insert works from toolbar and slash menu on desktop + 375px; invalid
URL disables Insert; Escape/Cancel inserts nothing.

### D7. Toolbar slim-down + responsive collapse (`TipTapToolbar.svelte`)

With marks in the bubble menu, the top bar is block/insert/history + Save, one row,
never wrapping (`flex-nowrap`):

- Always visible (all viewports): Block-format `select select-sm select-ghost w-fit`
  (P/H1/H2/H3/Code) · Bullet-list btn · Ordered-list btn · overflow trigger ·
  spacer (`ms-auto`) · Undo · Redo · hairline · **Save** (`btn-primary btn-sm`, label).
- Desktop (`sm:` and up) additionally top-level: Blockquote · Divider (hr) · Image ·
  hairline before undo. Alignment lives in an overflow dropdown even on desktop (rare
  action; 4 buttons don't earn top-level space).
- Overflow menu: common-ui `Dropdown` + `Menu`/`MenuItem` (`more_horiz` ghost square
  trigger). Contents: Align left/center/right/justify (with active checkmarks) and
  Clear formatting; on `max-sm` it additionally contains Blockquote, Divider, Image.
  Implementation note: simplest correct responsive approach is rendering the three
  promotable buttons twice (top-level `max-sm:hidden`, menu items `sm:hidden`) —
  cheap, no JS measurement; do NOT build a measuring auto-collapse.
- Remove from toolbar: bold/italic/underline/strike/inline-code buttons, the link
  button, the prompt-based image/link functions (moved per D4/D6).
- Keep: revision-based `$derived` active/can state (pattern works), `aria-pressed`,
  Tooltip wrappers, `getActiveBlockFormat`/`setBlockFormat`.
- Restyle per D2 (ghost buttons, `bg-primary/10 text-primary` active, hairline
  separators, labeled primary Save).
- Toolbar container: `flex items-center gap-1 px-2 py-1.5 border-b border-base-300
overflow-x-auto` (scroll is the final fallback below ~340px, not wrap).

Acceptance: exactly one row at 375px and 1280px; every removed action reachable via
bubble/slash/overflow; active states correct for select + list buttons + alignment
items; undo/redo disable correctly; Save shows spinner + resolves; nothing overlaps or
clips at 320–1440px widths.

### D8. Read-only mode & editor shell (`TipTap.svelte`)

- Container classes derived from `editable`:
  editable → `rounded-box border border-base-300 bg-base-100 focus-within:border-base-content/25`;
  read-only → none of those (bare block).
- Move `min-h-80` + padding out of `editorProps.attributes` into `editable`-conditional
  styling (component CSS keyed on `data-editable`, since ProseMirror's element class
  list is set once at creation): editable → `min-height: 20rem; padding: 1rem 1.5rem`
  (mobile `0.75rem 1rem` — x-padding is precious; the handle overlay may overlap the
  1rem gutter on hover, acceptable on hover-capable devices only); read-only →
  `min-height: 0; padding: 0`.
- `Link.configure({ openOnClick: 'whenNotEditable', ... })` so visitors can follow
  links but authors don't accidentally navigate (F4).
- Read-only must not render/enable: toolbar (already conditional), bubble menu, slash
  menu, drag handle (D3.5), image resize affordances
  (`[data-editable="false"] [data-resize-handle] { display: none }` + verify
  non-interactive per pending codex item).
- Keep: `enableContentCheck` + warning alert, `$effect` content sync, dynamic
  `setEditable`.
- `getPayload()` per Invariants; toolbar `saveContent` calls it.
- Keep the NodeSelection outline style but soften to
  `outline: 2px solid color-mix(in oklch, var(--color-primary) 45%, transparent); outline-offset: 2px;`.

Acceptance: read-only pane = clean prose (no border/padding/min-height/chrome), link
click opens tab; editable keeps frame + focus treatment; `getPayload()` returns null
pre-mount and the exact payload shape after; stringified→parsed JSON renders (demo
already exercises this).

### D9. Mobile/touch summary (cross-cutting; every UI chunk's acceptance includes it)

- 375px: no horizontal scroll anywhere (D3.1 fixes the current 702px scrollWidth);
  single-row toolbar (D7); bubble/slash shift into view (D4/D5); editor padding
  `0.75rem 1rem` (D8).
- Touch (`hover: none`): drag handle hidden entirely — reordering is not offered on
  touch in v1 (documented trade-off); everything else must work by tap: toolbar,
  overflow menu, slash menu (typing "/"), image dialog (bottom-sheet modal), bubble
  menu on native text selection.
- Hit targets ≥ 32px (`btn-sm` square) for all touch-reachable controls.

---

## Dependency policy

Installed and allowed: `@tiptap/suggestion@3.27.1` (exact pin; endorsed by the task
for the slash menu; it is headless input-trigger logic the floating toolkit does not
cover). **No other new tiptap packages** — bubble menu and slash UI are built on
`src/lib/components/common-ui/floating/` + `Portal` (user requirement). `Selection`
comes from the already-installed `@tiptap/extensions`. If an implementer believes
another dep is unavoidable, stop and escalate to the orchestrator instead.

`common-ui/**` is read-only (another agent is editing it concurrently). If a generic
gap blocks a chunk (none is expected — virtual-element support was verified in
`createFloating`), work around it locally in `wysiwyg/` and note the gap in the chunk
report rather than editing common-ui.

---

## Work chunks (dependency order)

Concurrency note: chunks 2–5 all edit `TipTap.svelte`. Run them sequentially (or give
each a worktree and rebase); 3, 4, 5 are independent of each other in behavior but not
in file surface. The recommended sequence 1→2→3→4→5→6→7→8 is safest.

### Chunk 1 — Playground page ✅ DONE (diagnosis session)

`src/routes/demo/+page.svelte`. Seeded editable instance (h1, marked-up paragraph,
h2s, nested bullet list, ordered list, blockquote, code block, external image, hr),
read-only "Published view" fed by Save through stringify→parse, Editable toggle,
side-by-side toggle (`xl:flex-row`). Verified in browser. Only touch it again if a
later chunk needs extra seed cases (e.g. an empty-doc button to test placeholder).

### Chunk 2 — Editor core ✅ DONE (browser-verified 2026-07-08)

Verified on /demo (synthetic events + `getComputedStyle`/`getBoundingClientRect`):

- **D1 spacing** — measured margins match the table exactly: p `0 0 8px`/lh 22.4, h2
  `20px/6px`, h3 `16px/4px`, hr `20px` (was 48), img `0` (F1c fix — margin moved to
  `[data-resize-wrapper]`), blockquote `12px` + `font-style:normal`, li `2px`, `li>p`
  `0`, inline code pill (no backticks). First/last child margins collapsed. Read-only
  pane matches editor rhythm.
- **D3 drag handle** — container `relative` re-anchors the plugin wrapper; plain blocks
  (h1/p/h2/blockquote/pre/hr) align at dyTop 2px / 6px gap; `nested` removed so lists
  target the top-level block consistently (no wrong-block anchoring — F1b gone). After
  1280→375 resize `document.documentElement.scrollWidth === 375` (F1a fixed). Handle is
  18px `drag_indicator` at 40%/70% opacity, grab/grabbing cursor. Image handle now
  ~10px high-anchored (was 32px F1c) — minor residual, images are an edge case; flagged
  for the real-pointer gate.
- **F3 placeholder** — `showOnlyCurrent: true` + broadened `.is-empty[data-placeholder]`
  CSS: empty paragraph shows "Write patch notes...", empty heading shows "Heading N"
  (per-node placeholder function).
- **D8 read-only shell** — read-only pane has border `0`, bg transparent, radius `0`,
  padding `0`, min-height `0`, drag handle `display:none`; links keep `target=_blank`
  (`openOnClick: 'whenNotEditable'`). Editable frame + `focus-within` treatment present.
- **getPayload / invariants** — `getPayload()` returns null pre-mount, exact payload
  shape after; toolbar Save routes through it (single source of truth); Save round-trip
  updates the published pane; runtime editable flip works (toolbar + bubble mount/unmount).
- Editor creation converted from `onMount`+`bind:this` to an `{@attach}` (untracked).
- **Deferred to final gate:** real-pointer drag-reorder (drop completes, dropcursor),
  real hover fidelity, image-handle exact alignment.

<details><summary>Original spec</summary>

**Files:** `TipTap.svelte`, `TipTapTypes.ts` (+ move `normalizeUrl` helpers here).
**Spec:** D1, D3, D8, F3 fix (`showOnlyCurrent: true`; extend the placeholder CSS to
any `.is-empty[data-placeholder]::before` current node — paragraphs AND empty
headings — not just `p:first-child`; optional nicety: placeholder function returning
"Heading 1/2/3" inside empty headings), plus the Invariants (getPayload export).
**Implementer: Claude opus** (drag-handle feel + spacing rhythm are taste-critical;
the CSS-layer subtleties bite). Codex could do the getPayload/types part but it is not
worth splitting.
**Verify:** preview_start "dev" → /demo; re-run the F1 repro matrix (hover every block
type; measure handle deltas via `getBoundingClientRect`), resize 1280→375 and assert
`scrollWidth === 375`, clear content → placeholder appears, read-only pane bare,
`getComputedStyle` spot-checks vs the D1 table. Real-pointer drag-reorder check (can
delegate to a codex computer-use run via the orchestrator).

</details>

### Chunk 3 — Selection bubble menu ✅ DONE (browser-verified 2026-07-08)

Built `TipTapBubbleMenu.svelte` on the in-repo `createFloating` (virtual reference =
`posToDOMRect(view, from, to)`, `contextElement`); registered the `Selection` extension.
Verified on /demo (real ProseMirror selections via a temporary DEV hook, since the
preview tab lacks OS focus; hook removed after):

- **Open/close conditions** — appears on a real text selection; **never** in read-only
  (gated + `editor.isEditable` check), code block, on a node selection (image), or when
  collapsed. `pointerDown`/`pointerup` gate (mouseup-only) and keyboard selections are
  wired but need the real-pointer gate to confirm the drag-suppression feel.
- **Positioning** — `placement:'top'`, `[offset(8), flip(), shift({padding:8})]`, Portal
  to body; fits within a 375px viewport in both button and link modes (menu 8px from
  edge, `scrollWidth === 375`, input `w-64` fits).
- **Link flow (no window.prompt)** — click Link → `input input-sm w-64` (prefilled);
  Enter applies via `extendMarkRange('link').setLink` (normalizes `example.com` →
  `https://…`); Remove (shown only when a link exists) via `unsetLink`; Escape in link
  mode → back to buttons, Escape in buttons → dismiss. `.selection` decoration keeps the
  selection visible while the editor is blurred (link input focused).
- **D2 aesthetic (corrected per user review)** — surface `bg-base-100` +
  `border-base-content/20` + `shadow-lg`; buttons `btn-soft` (not ghost) with legible
  `base-content` icons; active = `bg-primary/20 text-primary`. Style contrast confirmed
  by `getComputedStyle` in **both** light and dark themes (active/resting unmistakable,
  menu reads as a bounded floating surface).
- Reactivity: active/selection state derived off the transaction `revision`; link input
  auto-focus via `{@attach}`; only 3 `$effect`s, all external-system sync (see report).
- **Deferred to final gate:** real-pointer mouseup-only appearance, real keyboard
  selection, near-top flip with a real viewport, mobile touch + native-selection callout.

<details><summary>Original spec</summary>

**Files:** `TipTapBubbleMenu.svelte` (new), `TipTap.svelte` (mount + Selection ext),
`TipTapTypes.ts` (shared url helpers land in Chunk 2).
**Spec:** D4, D2.
**Implementer: Claude opus** (interaction feel: when it appears/disappears is the
whole game).
**Verify:** interactively — mouse selection (appears on mouseup only), keyboard
selection, near-top flip, 375px shift, link add/edit/remove incl. Enter/Escape paths,
blurred-selection highlight visible, never in read-only/code block/node selection.
Real-pointer verification via orchestrator-delegated codex run.

</details>

### Chunk 4 — Slash command menu

**Files:** `slashCommand.ts` (new), `TipTapSlashMenu.svelte` (new), `TipTap.svelte`
(wire options + bind instance), `TipTapTypes.ts` (item types).
**Spec:** D5, D2.
**Implementer: codex (gpt-5.5)** for the extension/suggestion plumbing is tempting,
but the menu look + keyboard feel are user-facing: **Claude opus**, with the
suggestion-wiring reference above making it mostly mechanical. (If splitting is easy
at delegation time: codex does `slashCommand.ts` + types against this spec, opus does
the Svelte menu + integration + polish.)
**Verify:** keyboard-only run (type "/he", Enter), mouse run, Escape run, empty-filter
close, mid-paragraph trigger, 375px + keyboard-open sizing, read-only inert.

### Chunk 5 — Image dialog + toolbar slim-down/responsive

**Files:** `TipTapImageDialog.svelte` (new), `TipTapToolbar.svelte` (rework),
`TipTap.svelte` (dialog mount + open hooks).
**Spec:** D6, D7, D2.
**Implementer: Claude opus** (toolbar composition is taste-critical); the dialog alone
is codex-grade but ships in the same chunk.
**Verify:** all D7 acceptance at 320/375/768/1280px; insert image via toolbar + slash;
overflow menu contents per breakpoint; active states; Save spinner.

### Chunk 6 — Quirk-audit sweep + cross-mode consistency pass

**Files:** any `wysiwyg/**` + `demo/**` residue.
**Work:** walk F4/F5 list end-to-end and fix leftovers: read-only resize handles
inert+hidden, selectednode outline softness, gapcursor visibility after hr/image,
focus/blur frame states, spacing parity editor vs read-only, `prose-img` rounded
corners retained, dead `patchhub-rich-text` class removal decision (grep first).
**Implementer: Claude opus** (judgment calls).
**Verify:** side-by-side visual parity screenshots; the full F-list as a checklist.

### Chunk 7 — Format + static checks

`npx prettier --write` on all touched files; svelte-autofixer clean on every
`.svelte`/`.svelte.ts` in `wysiwyg/` + `demo/`; targeted
`npx svelte-check --tsconfig ./tsconfig.json` reading only wysiwyg/demo diagnostics
(ignore concurrent-agent errors elsewhere; do NOT run `npm run validate`).
**Implementer: codex (gpt-5.5)** — mechanical.

### Chunk 8 — Final interactive verification (gate)

Re-run the complete acceptance matrix on /demo: the F1 repro grid, D4/D5 interaction
scripts, D7 breakpoints, D8 read-only checklist, plus a real-pointer codex
computer-use pass (drag-reorder, image resize drag, hover fidelity, mobile 375px) —
delegated by the orchestrator, not spawned by implementer subagents. Any failure loops
back to the owning chunk. **Stop the dev server when done.**

## Validation

- [x] Chunks 2–3 acceptance criteria verified interactively (browser) — 4–6 pending
- [x] prettier + svelte-autofixer clean on chunk 2/3 touched files
- [x] Targeted svelte-check clean for `wysiwyg/**` + `demo/**` (0 errors/warnings)
- [x] Frozen contract checks (chunk 2/3): props unchanged, `getPayload()` shape/null,
      read-only JSON round-trip via /demo Save, runtime editable flip
- [x] Mobile (chunk 2/3): no horizontal scroll at 375px (`scrollWidth === 375`), bubble
      menu on-screen at 375px — toolbar 1-row is chunk 5

## Notes

- Deliberately skipped for v1 (document in final report): per-list-item drag handles
  (v3 `nested` mode is the buggy path — F1b), touch drag-reorder, "Turn into" block
  dropdown in the bubble menu (stretch; add only if Chunk 3 lands early and clean),
  drag-handle "+" insert button (Notion has one; slash menu covers insertion),
  text-align controls beyond the overflow menu, image upload (URL-only), fake
  text-selection preservation beyond the `Selection` extension.
- The dev server for verification: `preview_start` MCP with launch config "dev"
  (port 5173) or `npm run dev`. Always stop servers started for verification.
- tiptap docs for the installed major: https://tiptap.dev/docs (v3). Check
  `node_modules/@tiptap/*/dist` source over training data when behavior is surprising
  (the placeholder viewport path and StarterKit v3 contents were both
  training-data traps in this diagnosis).
