<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		class: classNames = 'btn-primary',
		icon,
		text,
		children,
		...restProps
	}: {
		class?: string;
		icon?: string;
		text?: string;
		children?: Snippet;
	} & HTMLButtonAttributes = $props();
</script>

<button class="btn {classNames}" {...restProps}>
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
