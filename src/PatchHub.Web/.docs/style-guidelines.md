# Style Guidelines

Use this guidance for any UI, markup, styling, or interaction change. Read it before writing markup and check your work against it before finalizing.

This is a dense, professional tool for eye doctors. They work fast, repeat the same tasks many times a day, and need many controls within reach. Optimize for that user, not for a screenshot.

## Design North Star

Aim for the feel of a focused professional desktop tool: Linear, Vercel/v0, Figma, Darwin. Calm, dense, precise, and quiet. The UI should disappear so the clinical work stands out.

Concretely, that means:

- **Compact and information-dense.** Fit real functionality on screen. Tight, consistent spacing. No large empty showcase areas, no oversized hero sections, no marketing rhythm.
- **Flat and quiet.** Hierarchy comes mostly from spacing, alignment, weight, and contrast rather than from heavy boxes, borders, and shadows. Surfaces stay calm so that intentional color reads clearly.
- **Purposeful color.** Use the theme's semantic palette, do not avoid it. Color should carry meaning and hierarchy: primary for the main action and brand emphasis, accents for supporting emphasis, status colors for state. Aim for a confident, deliberate use of color, not a sea of neutral and not a rainbow.
- **Pragmatic and low-friction.** The actions a clinician needs next should be visible and reachable in one or two clicks. Do not bury frequent actions in nested menus.

If a choice makes the screen busier without helping the user recognize, compare, navigate, input, or act, do not make it.

## Think About The User First

Before styling, reason about the workflow, not just the components:

- What is the user doing on this screen, and what do they do next?
- Which actions are frequent vs. rare? Frequent actions belong in the primary surface (toolbar, row, header), reachable in one click. Rare actions can live in an overflow menu or dropdown.
- Are related controls grouped where the eye and hand expect them? Place an action near the content it affects.
- Does anything force an extra click, scroll, or hunt for something used constantly? Remove that friction.

State the workflow assumption to yourself, then make the layout serve it. A technically clean screen that puts a common action three clicks deep is a worse result than a plain screen that puts it one click away.

## Styling Priority

Always prefer the existing design system, in this order:

1. **Existing project Svelte components**, especially the wrappers in `src/lib/Components/CommonUI` (e.g. `Button`, `Card`, `Modal`, `Input`, `Select`, `MultiSelect`, `Checkbox`, `Menu`/`MenuItem`, `List`/`ListRow`, `Search`, `Badge`, `Avatar`, `Icon`, `Fab`, `DateInput`, `DateRangePicker`, and the `Floating/*` primitives like `Dropdown`, `Tooltip`, `Popover`, `ContextMenu`). Search for an existing component that already solves the interaction before building markup.
2. **DaisyUI** component classes and variants for standard controls and surfaces (`btn`, `input`, `select`, `menu`, `tabs`, `modal`, `dropdown`, `join`, `table`, etc.).
3. **Tailwind utilities** for layout and spacing only: composition (`flex`, `gap-*`, `items-*`, `justify-*`), spacing (`p-*`, `m-*`), sizing (`w-*`, `max-w-*`, `h-*`), and small state refinements.
4. **Custom CSS** only when the behavior or treatment genuinely cannot be expressed with the above. Document why.

Do not hand-roll a button, input, modal, dropdown, or menu with raw Tailwind when a wrapper or DaisyUI class exists. Do not duplicate a component to make a small visual variation; extend or configure the existing one.

When a DaisyUI skill or reference is available locally, use it for class names, variants, and theme-safe semantic colors.

## Color And Theming

DaisyUI gives you a full semantic palette per theme. **Use it.** The goal is to apply color the way a good designer would, following normal design principles, while staying theme-safe across the ~19 themes this app ships. Hardcoded colors break theming and are a defect.

**Always use DaisyUI semantic color classes**, never raw Tailwind palette colors or hardcoded hex for theme surfaces, text, borders, or accents: no `bg-white`, `bg-gray-100`, `text-gray-500`, `bg-slate-800`, `border-gray-200`, etc. They look fine in one theme and broken in the rest. (The viewer's true-black imaging chrome is the only place a literal `black`/`white` is acceptable, and only for image canvas surfaces.)

Use each role for what it is for:

- **`base-100/200/300` + `base-content`** are your surfaces and structure: page and panel backgrounds, layered regions, body text (use opacity for secondary text, e.g. `text-base-content/60`). This is the calm canvas the rest of the color sits on, not a mandate to make everything gray.
- **`primary`** is for the main action and primary brand emphasis in a context: the key button, the active/selected state, a highlighted nav item. Lead with it where it guides the user.
- **`secondary` / `accent`** are for supporting emphasis and visual interest: secondary actions, highlights, chart/data accents, brand moments. Use them intentionally to add life where it helps.
- **`neutral`** is a strong non-base surface for things like solid toolbars, tooltips, or controls that should stand apart from `base`.
- **`info` / `success` / `warning` / `error`** communicate state: informational, confirmation/healthy, caution, destructive/failed. Use them for their meaning. Do not pick `success` just to get green or `error` just to get red, and do not reserve "all color" for status only.

Apply normal hierarchy principles: a dominant calm surface, a clear primary accent for the most important actions, and supporting colors used sparingly for emphasis and data. Both extremes are wrong: an all-neutral screen that hides the primary action, and a screen where many competing colors flatten the hierarchy.

**Always pair colored surfaces with their `*-content` color.** Text/icons on `bg-primary` use `text-primary-content`, on `bg-base-200` use `text-base-content`. Do not put `text-base-content` on a `bg-primary` surface. This keeps contrast correct in every theme.

Use the `base` scale and color first to separate regions; reach for borders as described below when surface contrast alone is genuinely ambiguous.

### Gradients And Decoration (Sparingly)

The default surface is flat. Decoration is the exception, used only when it genuinely improves the result.

- **Gradients are allowed in moderation.** A gentle gradient can be a nice touch on a hero, a key accent, or a brand surface. When you use one, **build it from DaisyUI semantic colors** (e.g. `from-primary to-secondary`, or subtle `from-base-200 to-base-300`), never from raw palette colors or hardcoded hex, so it survives every theme. Keep it subtle and rare. Do not gradient-ify ordinary surfaces, every card, buttons, borders, or text. If a screen has more than one gradient, you almost certainly have too many.
- **No heavy decorative effects.** Avoid blurred blobs, large drop shadows for flair, glassmorphism, and oversized rounded "pill" containers around whole sections. Shadow is for genuinely floating layers (dropdowns, modals, popovers), which DaisyUI already handles.
- **No icon-as-decoration.** An icon must clarify an action or status. Do not sprinkle icons next to headings for visual interest.

## Cards, Boxes, And Borders (Use With Restraint)

Cards and borders are fine and encouraged when they help. Excessive and nested containers are the most common way this UI looks AI-generated, so use them deliberately, not by default.

- **Use the `Card` wrapper (`src/lib/Components/CommonUI/Card.svelte`, a DaisyUI card wrapper) when a real boundary helps:** a repeated entity in a list/grid, a genuinely self-contained tool or widget, a dialog, or content that needs to read as a distinct unit. Reach for it on purpose, not for every section.
- **Do not wrap every section, toolbar, metric, or form group in its own card or box.** A heading plus spacing is usually enough to define a region. When you think you need a box, first try removing it and using spacing; keep it only if the screen is genuinely clearer with it.
- **Avoid nesting cards/boxes.** Do not put a card inside a card or a bordered box inside a bordered box just to subdivide. Nesting is only appropriate when the inner items are real independent entities (e.g. entity cards inside a list region), not for visual grouping.
- **Borders are allowed, within reason.** A subtle border (`border-base-300`) is a valid way to separate content. Do not stack separation mechanisms: avoid a bordered card whose children are also bordered, plus dividers, plus background changes, all at once. Pick one mechanism per level.
- **Prefer the lightest separation that works**, in this order: spacing > subtle surface change (`base-100`/`200`/`300`) > divider > border > card. Move up only when the lighter option is genuinely ambiguous.

If a screen has many visible rectangular boundaries that are not real list/grid entities, it is probably over-boxed. Simplify.

## Layout

Favor simple, readable, predictable layouts.

- **Use `flex` and gap for almost everything.** Stack, row, split-panel, and toolbar patterns cover most needs.
- **Avoid complex grids.** Do not reach for `grid-cols-*`, `col-span-*`, `row-span-*`, nested grids, or arbitrary breakpoints unless the content is genuinely tabular or a real dashboard. A `flex` row with `gap` and `flex-wrap` is usually the right answer.
- **Use the standard spacing scale.** Stick to Tailwind's scale (`gap-2`, `p-3`, `mt-4`, etc.). No arbitrary or fractional spacing values like `p-[7px]`, `mt-[13px]`, `gap-[5.5px]`. If the scale does not fit, the layout approach is usually wrong.
- **No layout tricks.** No hidden spacer elements, no magic negative margins to force alignment, no ordering hacks. A maintainer should predict the rendered and mobile layout from the markup.
- **Keep responsive behavior explicit and minimal.** Prefer one or two clear breakpoints over many. The mobile result should be obvious from the classes.

Controls must be stable: they should not jump, resize, reflow, or overlap when data loads, text wraps, or the viewport narrows.

## Controls And Density

This is a tool with many buttons. Make them compact, legible, and discoverable.

- **Use the project wrappers and DaisyUI classes** for buttons, menus, tabs, inputs, toggles, modals, drawers, toolbars, tables, and selectors. Reach for the `Button` wrapper (which already provides tooltip support) rather than raw `<button class="btn">` when a tooltip or icon affordance helps.
- **Group related actions** with `join` / toolbars / button groups so a cluster of tools reads as one unit instead of scattered buttons.
- **Prefer compact controls** (`btn-sm`, tight `gap`) over large decorative ones, but keep hit targets comfortable and spacing consistent. Dense, not cramped.
- **Use `btn-ghost` / low-emphasis styling for secondary and tool actions**, and reserve `btn-primary` for the single main action in a context. Do not make many buttons primary; if everything is emphasized, nothing is.
- **Give states distinct, real treatment:** hover, focus, active, selected, disabled, loading, empty, and error. Use icons for recognition, but keep a text label when the action would otherwise be ambiguous.
- **Move rare actions into overflow** (`Menu`/`Dropdown`/`ContextMenu`) instead of crowding the primary surface, but keep frequent actions one click away on that surface.
- **Preserve accessibility.** Keep labels, focus styles, native semantics, and accessible names. Do not strip them for visual neatness. Show loading and failure near the control or content they affect.

## Badges, Labels, And Noise

- Add a badge, pill, chip, label, helper text, or section header **only when it helps the user decide or act.**
- Do not invent dashboard noise: irrelevant stats, decorative status tags, redundant headers, or metadata that repeats nearby text.
- Do not replace a clear standard control with a custom novelty control unless there is a real UX benefit.

Every visible element must earn its space by aiding recognition, comparison, navigation, input, feedback, or trust.

## Pre-Finalization Checklist

Before finishing any style change, verify:

- **Components:** Used existing Svelte/CommonUI wrappers first, then DaisyUI, then Tailwind for layout only. No hand-rolled control that a wrapper/DaisyUI class already provides.
- **Color:** Only semantic DaisyUI colors (no raw palette/hex), correct `*-content` pairing. Palette used purposefully, primary leads the key action and accents add emphasis, neither all-neutral nor over-colored. Any gradient is subtle, rare, and built from semantic colors.
- **Containers:** Cards/boxes/borders used deliberately, not by default. No unnecessary nesting, no stacked separation. Lightest separation that works (spacing > surface > divider > border > card).
- **Layout:** `flex`/gap over complex grids. Standard spacing scale only, no arbitrary/fractional values. No layout hacks. Stable controls.
- **Workflow:** Frequent actions are one click away and well placed; rare actions are in overflow. The layout matches what the user does next.
- **States & responsiveness:** Hover, focus, active, selected, disabled, loading, empty, and error handled. Checked for wrapping, overflow, and overlap on narrow and wide viewports.
