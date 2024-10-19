<script lang="ts">
	import { onMount } from 'svelte';

	let {
		icon = 'info',
		size = 'md',
		style = 'round',
		class: className = ''
	}: {
		/**
		 * The name of the icon from https://fonts.google.com/icons?icon.set=Material+Icons
		 * @type string
		 * @default 'info'
		 */
		icon: string;
		/**
		 * The size of the icon: sm, md, lg, xl
		 * @type string
		 * @default 'md'
		 */
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;
		/**
		 * The style of the icon: round, or rounded outline
		 * @type string
		 * @default 'round'
		 */
		style?: 'round' | 'outlined';
		class?: string;
	} = $props();
	const fill = getFill();
	let grad = $state(0);
	let opsz = $state(40);

	function getFill() {
		switch (style) {
			case 'round':
				return 1;
			case 'outlined':
				return 0;
		}
	}

	onMount(() => {
		switch (size) {
			case 'xs':
			case 'sm':
			case 'md':
				opsz = 24;
				break;
			case 'lg':
			case 'xl':
				opsz = 48;
				break;
			default:
				opsz = 24;
				break;
		}
	});
</script>

<span
	class="material-symbols-rounded icon-{size} {className}"
	class:align-bottom={!className.includes('align-')}
	style={`font-variation-settings: 'FILL' ${fill}, 'wght' 400, 'GRAD' ${grad}, 'opsz' ${opsz};`}
>
	{icon}
</span>
