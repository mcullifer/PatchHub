<script lang="ts">
	import { inview, type ObserverEventDetails } from 'svelte-inview';

	type InViewOptions = {
		root?: HTMLElement | null;
		rootMargin?: string;
		threshold?: number | number[];
		unobserveOnEnter?: boolean;
	};
	let {
		opts,
		onInviewChange
	}: {
		opts: InViewOptions;
		onInviewChange: (e: CustomEvent<ObserverEventDetails>) => void;
	} = $props();
</script>

<div class="sentinel" use:inview={opts} oninview_change={onInviewChange}></div>
