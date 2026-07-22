<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';

	let {
		favorited,
		onToggle,
		size = 'sm',
		class: className,
		disabled = false,
		...rest
	}: {
		favorited: boolean;
		onToggle: () => void | Promise<void>;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
		class?: ClassValue;
	} & Omit<HTMLButtonAttributes, 'class'> = $props();

	let toggling = $state(false);

	async function toggle(): Promise<void> {
		if (toggling) return;

		toggling = true;
		try {
			await onToggle();
		} finally {
			toggling = false;
		}
	}
</script>

<button
	type="button"
	aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
	aria-pressed={favorited}
	aria-busy={toggling}
	disabled={disabled || toggling}
	{...rest}
	class={['btn btn-circle swap', favorited && 'swap-active', className]}
	onclick={toggle}
>
	<Icon icon="favorite" style="outlined" class="swap-off" {size} />
	<Icon icon="favorite" class="swap-on text-pink-500" {size} />
</button>
