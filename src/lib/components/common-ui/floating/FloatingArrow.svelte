<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { FloatingContext } from './floating.svelte';

	let {
		context,
		class: className = '',
		borderClass = '',
		ref = $bindable<SVGSVGElement | null>(null)
	}: {
		context: FloatingContext;
		class?: ClassValue;
		borderClass?: ClassValue;
		ref?: SVGSVGElement | null;
	} = $props();

	const arrowData = $derived(
		(context.middlewareData.arrow ?? {}) as {
			x?: number;
			y?: number;
		}
	);

	const staticSide = $derived.by(() => {
		switch (context.placement.split('-')[0]) {
			case 'top':
				return 'bottom';
			case 'bottom':
				return 'top';
			case 'left':
				return 'right';
			default:
				return 'left';
		}
	});

	const arrowStyle = $derived.by(() => {
		const styles = ['position: absolute', 'pointer-events: none', 'overflow: visible'];

		if (arrowData.x != null) styles.push(`left: ${arrowData.x}px`);
		if (arrowData.y != null) styles.push(`top: ${arrowData.y}px`);

		styles.push(`${staticSide}: -5px`);
		return styles.join('; ');
	});

	const borderPath = $derived.by(() => {
		switch (context.placement.split('-')[0]) {
			case 'top':
				return 'M 0.75 5 L 5 9.25 L 9.25 5';
			case 'bottom':
				return 'M 0.75 5 L 5 0.75 L 9.25 5';
			case 'left':
				return 'M 5 0.75 L 9.25 5 L 5 9.25';
			default:
				return 'M 5 0.75 L 0.75 5 L 5 9.25';
		}
	});
</script>

<svg
	bind:this={ref}
	viewBox="0 0 10 10"
	width="10"
	height="10"
	style={arrowStyle}
	class={className}
	aria-hidden="true"
>
	<rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" />
	{#if borderClass}
		<path
			d={borderPath}
			class={borderClass}
			fill="none"
			stroke-width="1"
			stroke-linecap="square"
			stroke-linejoin="miter"
			vector-effect="non-scaling-stroke"
		/>
	{/if}
</svg>
