# Svelte 5 Guidelines

Use modern Svelte 5 conventions for all new components and modules.

## Reactivity

- Use `$state` only for values that need to update the template, `$derived`, or `$effect`.
- Use `$state.raw` for large API response objects that are replaced instead of deeply mutated.
- Use `$derived` for computed values.
- Use `$derived.by` when the computation needs multiple statements.
- Avoid `$effect` unless syncing with an external system or browser API. Do not update normal state from effects when derived state or event handlers can do the job.
- Use `$inspect` only while debugging and remove it before finishing work.

## Props and Events

- Use `$props()` instead of `export let`.
- Treat props as changing over time. Derived values from props should usually be `$derived`.
- Use callback props and modern event attributes such as `onclick`, not `on:click`.
- Use snippets and `{@render ...}` for reusable markup slots in new Svelte 5 code.

## Markup

- Prefer keyed `{#each}` blocks with stable ids. Do not use array indexes as keys unless the list is static and cannot reorder.
- Keep conditionals readable. Avoid deep nesting by extracting components or named booleans.
- Use accessible native elements first.
- Ensure interactive controls have clear labels, names, or accessible text.

## Component Boundaries

- Reuse components from `src/lib/components/common-ui` before creating new primitives.
- Keep route pages focused on composition and page-specific state.
- Extract repeated update cards, source badges, filters, or empty states into components when reused.
- Avoid one-off component abstractions until the second clear use case appears.

## Styling

- Prefer class arrays/objects and `clsx`-style composition in `class` attributes.
- Avoid legacy `class:` directives in new code.
- Use CSS custom properties when parents need to influence child component styles.
- Keep component CSS scoped and minimal.
