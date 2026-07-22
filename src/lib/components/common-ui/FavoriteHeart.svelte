<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';

	let {
		favorited,
		onToggle,
		size = 'sm',
		class: className,
		...rest
	}: {
		favorited: boolean;
		onToggle: () => void;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
		class?: ClassValue;
	} & Omit<HTMLButtonAttributes, 'class'> = $props();
</script>

<button
	type="button"
	aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
	aria-pressed={favorited}
	{...rest}
	class={['btn btn-circle swap', favorited && 'swap-active', className]}
	onclick={onToggle}
>
	<Icon icon="favorite" style="outlined" class="swap-off" {size} />
	<Icon icon="favorite" class="swap-on text-pink-500" {size} />
</button>
