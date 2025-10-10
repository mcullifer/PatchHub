<script lang="ts" generics="T">
	import { useIntersectionObserver, type UseIntersectionObserverOptions } from 'runed';
	import type { Snippet } from 'svelte';

	interface IVisibleWhenInViewProps<T> {
		items: T[];
		template: Snippet<[T, number]>;
		fallback?: Snippet;
		opts?: UseIntersectionObserverOptions;
		visibleOnStart?: number;
		increment?: number;
		onInviewChange?: (entries: IntersectionObserverEntry[]) => void;
	}

	let {
		items,
		template,
		opts,
		visibleOnStart = 5,
		increment = 5,
		onInviewChange,
		fallback
	}: IVisibleWhenInViewProps<T> = $props();

	let max = $state(visibleOnStart);
	let inviewTarget = $state<HTMLElement | null>(null);
	const observer = useIntersectionObserver(
		() => inviewTarget,
		(entries) => {
			if (entries[0].isIntersecting) {
				max += increment;
			}
			onInviewChange?.(entries);
			if (max >= items.length) {
				observer.stop();
			}
		},
		opts ?? { root: () => null, threshold: 0.1 }
	);

	export function resume() {
		observer.resume();
	}
</script>

{#each items as item, i (i)}
	{#if i < max}
		{@render template(item, i)}
	{/if}
{:else}
	{@render fallback?.()}
{/each}
<div class="sentinel" bind:this={inviewTarget}></div>
