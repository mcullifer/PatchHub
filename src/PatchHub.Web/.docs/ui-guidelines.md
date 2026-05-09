# UI Guidelines

## Priority Order

When building UI controls or patterns, use this order:

1. Existing PatchHub components in `src/lib/components/common-ui`.
2. DaisyUI components and theme tokens.
3. Tailwind utilities for layout, spacing, responsive behavior, and small adjustments.
4. Custom component CSS only when the first three options cannot express the needed behavior cleanly.

Do not create a new custom button, menu, card, badge, dropdown, modal, or input style when an existing component or DaisyUI pattern fits.

## Visual Direction

- PatchHub is an update discovery tool, so screens should feel efficient, calm, and scan-friendly.
- Prioritize readable lists, clear hierarchy, source attribution, timestamps, and useful filters.
- Avoid marketing-page composition for product workflows.
- Avoid custom color palettes that fight the DaisyUI theme.
- Keep cards modest and information-dense. Do not nest cards inside cards.

## Tailwind and DaisyUI

- Use DaisyUI classes for common controls: `btn`, `input`, `select`, `badge`, `card`, `menu`, `dropdown`, `tabs`, `alert`, `modal`, and similar primitives.
- Use Tailwind mainly for layout utilities such as `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `max-w-*`, and responsive variants.
- Prefer DaisyUI semantic colors such as `primary`, `secondary`, `accent`, `neutral`, `base-*`, `info`, `success`, `warning`, and `error`.
- Avoid hard-coded colors unless there is a specific product reason.

## Accessibility

- Use real buttons, links, labels, inputs, headings, and lists.
- Do not use clickable `div` elements.
- Preserve keyboard navigation for menus, dialogs, forms, and search flows.
- Provide visible focus states through existing DaisyUI or browser defaults.
- Ensure icons-only buttons have accessible labels and tooltips when helpful.

## Layout

- Make dense data views easy to scan on desktop and mobile.
- Set stable dimensions for repeated UI where loading states or dynamic labels could shift layout.
- Avoid text overlap by testing narrow widths.
- Prefer empty states that tell the user what is missing and what action is available.
