<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import type { Snippet } from 'svelte';

	let {
		class: classNames = 'btn-primary',
		icon,
		text,
		children
	}: {
		class?: string;
		icon?: string;
		text?: string;
		children?: Snippet;
	} = $props();
</script>

<button class="btn {classNames}">
	{#if icon}
		<Icon {icon} />
	{/if}
	{#if text}
		{text}
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
