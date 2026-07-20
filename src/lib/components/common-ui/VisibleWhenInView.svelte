<script lang="ts" generics="T">
	import { useIntersectionObserver, type UseIntersectionObserverOptions } from 'runed';
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	interface IVisibleWhenInViewProps<T> {
		items: T[];
		template: Snippet<[T, number]>;
		enabled: boolean;
		fallback?: Snippet;
		opts?: UseIntersectionObserverOptions;
		visibleOnStart?: number;
		increment?: number;
		onInviewChange?: (entries: IntersectionObserverEntry[]) => void;
	}

	let {
		items,
		template,
		enabled,
		opts,
		visibleOnStart = 5,
		increment = 5,
		onInviewChange,
		fallback
	}: IVisibleWhenInViewProps<T> = $props();

	const initialVisibleCount = untrack(() => visibleOnStart);
	const defaultObserverOptions = {
		root: () => null,
		threshold: 0.1
	} satisfies UseIntersectionObserverOptions;
	const observerOptions = untrack(() => opts ?? defaultObserverOptions);

	let max = $state(initialVisibleCount);
	const observeSentinel: Attachment<HTMLElement> = (node) => {
		const observer = useIntersectionObserver(
			node,
			(entries) => {
				if (entries[0].isIntersecting) {
					max = Math.min(max + increment, items.length);
				}
				onInviewChange?.(entries);
				if (max >= items.length) {
					observer.stop();
				}
			},
			observerOptions
		);

		return observer.stop;
	};
</script>

{#each items as item, i (i)}
	{#if i < max}
		{@render template(item, i)}
	{/if}
{:else}
	{@render fallback?.()}
{/each}
<!-- Absolutely positioned so it never occupies a cell in grid/flex parents; the
     nearest positioned ancestor must be the scrolled container for intersection
     to fire near its bottom edge. -->
{#if enabled}
	<div
		class="sentinel pointer-events-none absolute bottom-0 left-0 h-px w-full"
		{@attach observeSentinel}
	></div>
{/if}
