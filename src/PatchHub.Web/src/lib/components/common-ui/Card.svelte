<script lang="ts">
	import type { Snippet } from 'svelte';
	type CardProps = {
		title?: Snippet;
		children?: Snippet;
		class?: string;
	};
	let { title, children, class: classNames }: CardProps = $props();
</script>

<div class="card {classNames}">
	<div class="card-body">
		{#if title}
			<div class="card-title">
				{@render title()}
			</div>
		{/if}
		{@render children?.()}
	</div>
</div>
