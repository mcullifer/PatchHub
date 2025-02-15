<script lang="ts">
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

	let {
		onIcon,
		offIcon,
		checked = $bindable(false),
		iconSize = 'md',
		class: classNames = '',
		effect = '',
		...restProps
	}: {
		onIcon: string;
		offIcon: string;
		checked: boolean;
		iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
		class?: ClassValue;
		effect?: 'swap-rotate' | 'swap-flip' | '';
	} & Omit<HTMLInputAttributes, 'class' & 'checked'> = $props();
</script>

<label class={['swap', effect, classNames]}>
	<input type="checkbox" bind:checked {...restProps} />
	<Icon icon={onIcon} size={iconSize} class="swap-on" />
	<Icon icon={offIcon} size={iconSize} class="swap-off" />
</label>
