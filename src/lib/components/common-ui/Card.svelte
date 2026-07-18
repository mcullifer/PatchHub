<script lang="ts">
	import type { Snippet } from 'svelte';
	type CardProps = {
		title?: Snippet;
		children?: Snippet;
		figure?: Snippet;
		class?: string;
	};
	let { title, children, figure, class: classNames }: CardProps = $props();
</script>

<div class="card {classNames}">
	{#if figure}
		<figure>
			{@render figure()}
		</figure>
	{/if}
	<div class="card-body">
		{#if title}
			<div class="card-title">
				{@render title()}
			</div>
		{/if}
		{@render children?.()}
	</div>
</div>
