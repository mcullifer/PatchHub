<script lang="ts">
	import type { TooltipProps } from '$lib/components/common-ui/floating';
	import { arrow, flip, offset } from '@floating-ui/dom';
	import { onDestroy } from 'svelte';
	import { pop } from '$lib/util/transitions';
	import Portal from '../Portal.svelte';
	import FloatingArrow from './FloatingArrow.svelte';
	import {
		createFloating,
		useFloatingGroup,
		useHover,
		useInteractions,
		useRole,
		withInteractions
	} from './floating.svelte';

	const {
		reference,
		children,
		opts,
		floatingClass = '',
		arrowClass = 'fill-neutral',
		arrowBorderClass = '',
		arrowPadding = 0,
		delay = 100,
		portal = true
	}: TooltipProps = $props();

	const group = useFloatingGroup('tooltip');
	const id = $props.id();
	let requestedOpen = $state(false);
	let open = $derived(requestedOpen && group.activeId === id);
	let elemArrow: SVGSVGElement | null = $state(null);

	const base = createFloating({
		open: () => open,
		opts: () => ({
			placement: 'top',
			...opts,
			middleware: [
				offset(6),
				...(opts?.middleware ?? [flip()]),
				elemArrow && arrow({ element: elemArrow, padding: arrowPadding })
			]
		}),
		defaultPlacement: 'top',
		onOpenChange: (value) => {
			requestedOpen = value;
			if (value) {
				group.activate(id);
			} else {
				group.clear(id);
			}
		}
	});
	const tooltip = withInteractions(
		base,
		useInteractions([
			useHover(base.floatingContext, { openDelay: () => delay }),
			useRole(base.floatingContext, { role: 'tooltip' })
		])
	);

	onDestroy(() => {
		open = false;
	});
</script>

{@render reference(tooltip)}
<Portal disabled={!portal}>
	{#if tooltip.isOpen()}
		<div
			{...tooltip.floating({ class: ['floating z-50 drop-shadow-lg', floatingClass] })}
			transition:pop
		>
			{@render children()}
			<FloatingArrow
				bind:ref={elemArrow}
				context={tooltip.context}
				class={arrowClass}
				borderClass={arrowBorderClass}
			/>
		</div>
	{/if}
</Portal>
