<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		children,
		class: classNames = '',
		href,
		onclick
	}: {
		children: Snippet;
		class?: ClassValue;
		href?: string;
		onclick?: () => void;
	} = $props();
</script>

<li class={href == undefined && onclick == undefined ? classNames : ''}>
	{#if onclick != undefined}
		<button tabindex="0" class={classNames} {onclick}>
			{@render children()}
		</button>
	{:else if href != undefined}
		<a class={classNames} {href}>
			{@render children()}
		</a>
	{:else}
		{@render children()}
	{/if}
</li>
