<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';

	export let text = '';
	export let textSize = 'text-md';
	export let icon = '';
	export let iconSize: 'xs' | 'sm' | 'md' | 'lg' = 'md';
	export let iconEnd = false;
	export let iconClass = '';
	export let truncate = true;
	export { className as class };
	let className = '';
</script>

<div class={className} class:truncate>
	{#if icon && !iconEnd}
		<Icon {icon} size={iconSize} class="my-auto align-middle {iconClass}" />
	{/if}
	<span class="my-auto align-middle {textSize}">{text}</span>
	{#if icon && iconEnd}
		<Icon {icon} size={iconSize} class="my-auto align-middle {iconClass}" />
	{/if}
</div>
