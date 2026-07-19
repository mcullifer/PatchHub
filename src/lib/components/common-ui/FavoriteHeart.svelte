<script lang="ts">
	import Icon from './Icon.svelte';
	import type { ClassValue, HTMLLabelAttributes } from 'svelte/elements';

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
	} & Omit<HTMLLabelAttributes, 'class'> = $props();
</script>

<label {...rest} class={['swap', className]}>
	<input type="checkbox" checked={favorited} onchange={onToggle} />
	<Icon icon="favorite" style="outlined" class="swap-off" {size} />
	<Icon icon="favorite" class="swap-on text-pink-500" {size} />
</label>
