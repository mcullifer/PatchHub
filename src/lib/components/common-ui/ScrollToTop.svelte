<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { innerHeight, scrollY } from 'svelte/reactivity/window';
</script>

{#if (scrollY.current ?? 0) > (innerHeight.current ?? 0)}
	<button
		class="btn btn-circle btn-primary fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10"
		onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
	>
		<Icon icon="arrow_upward" />
	</button>
{/if}
