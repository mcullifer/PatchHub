<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import Tooltip from '$lib/components/common-ui/floating/Tooltip.svelte';
	import type { Snippet } from 'svelte';
	import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';

	let {
		class: classNames = 'btn-primary',
		icon,
		text,
		children,
		tip,
		...restProps
	}: {
		class?: ClassValue;
		icon?: string;
		text?: string;
		children?: Snippet;
		tip?: string;
	} & HTMLButtonAttributes = $props();
</script>

{#if tip !== undefined}
	<Tooltip>
		{#snippet reference(floating)}
			<button {...floating.reference({ class: ['btn', classNames] })} {...restProps}>
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
		{/snippet}
		<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
			{tip}
		</div>
	</Tooltip>
{:else}
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
{/if}
