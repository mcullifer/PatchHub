# Style Guidelines

Use this guidance for UI, markup, styling, and interaction changes. PatchHub is an update discovery tool, so screens should be efficient, calm, trustworthy, and easy to scan.

## Styling Priority

Prefer the existing design system in this order:

1. Existing PatchHub components in `src/lib/components/common-ui`.
2. DaisyUI components, variants, and semantic theme tokens.
3. Tailwind utilities for layout, spacing, responsive behavior, and small adjustments.
4. Custom component CSS only when the first three options cannot express the needed behavior cleanly.

Before building custom markup, search for nearby or shared components that already solve the same interaction pattern. Do not create a new custom button, menu, card, badge, dropdown, modal, or input style when an existing component or DaisyUI pattern fits.

## Visual Direction

- Prioritize readable lists, clear hierarchy, source attribution, timestamps, and useful filters.
- Favor clear scanning, comparison, navigation, input, feedback, and trust over decoration.
- Avoid marketing-page composition for product workflows.
- Avoid custom color palettes that fight the DaisyUI theme.
- Keep cards modest and information-dense. Do not nest cards inside cards.
- Avoid fake dashboard noise: irrelevant stats, decorative status labels, redundant section headers, or metadata that repeats nearby text.

## Tailwind and DaisyUI

- Use DaisyUI classes for common controls: `btn`, `input`, `select`, `badge`, `card`, `menu`, `dropdown`, `tabs`, `alert`, `modal`, and similar primitives.
- Use Tailwind mainly for layout utilities such as `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `max-w-*`, and responsive variants.
- Prefer DaisyUI semantic colors such as `primary`, `secondary`, `accent`, `neutral`, `base-*`, `info`, `success`, `warning`, and `error`.
- Avoid hard-coded colors unless there is a specific product reason.
- Avoid long class strings that encode a whole bespoke design.
- Avoid weird complicated tailwind grid layouts like `grid-cols-[minmax(0,1fr)_minmax(0,0)_auto]` unless it's
  necessary for a specific layout pattern.

## Layout

- Use simple flex, stack, split-panel, and grid patterns before complex nested grids.
- Keep responsive behavior explicit and easy to reason about.
- Make dense data views easy to scan on desktop and mobile.
- Set stable dimensions for repeated UI where loading states or dynamic labels could shift layout.
- Check narrow widths for wrapping, overflow, clipped content, and text overlap.

## Interactive Controls

- Prefer established project components for buttons, menus, tabs, inputs, toggles, modals, drawers, toolbars, tables, and selectors.
- Give primary, secondary, destructive, selected, and disabled states distinct visual treatment.
- Keep hit targets comfortable and spacing consistent.
- Use icons in controls when they improve recognition, but keep text where the action would otherwise be ambiguous.
- Make loading and failure states visible near the control or content they affect.

## Accessibility

- Use real buttons, links, labels, inputs, headings, and lists.
- Do not use clickable `div` elements.
- Preserve keyboard navigation for menus, dialogs, forms, and search flows.
- Provide visible focus states through existing DaisyUI or browser defaults.
- Ensure icons-only buttons have accessible labels and tooltips when helpful.

## Implementation Checks

- Confirm existing Svelte components are used first where practical.
- Confirm DaisyUI is used for standard component styling before bespoke Tailwind.
- Simplify complicated grid or arbitrary-value class strings.
- Remove decorative badges, cards, wrappers, icons, and labels that do not carry useful meaning.
- Verify hover, focus, active, disabled, loading, empty, and error states for touched interactions.
