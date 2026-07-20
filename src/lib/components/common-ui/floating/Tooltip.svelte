<script lang="ts">
	import type { TooltipProps } from '$lib/components/common-ui/floating';
	import { arrow, flip, offset } from '@floating-ui/dom';
	import { onDestroy } from 'svelte';
	import { pop } from '$lib/util/transitions';
	import { TOOLTIP_DELAY_MS } from './FloatingProps';
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
		delay = TOOLTIP_DELAY_MS,
		portal = true
	}: TooltipProps = $props();

	const group = useFloatingGroup('tooltip');
	const id = $props.id();
	let requestedOpen = $state(false);
	let open = $derived(requestedOpen && group.activeId === id);
	// Captured before activate() marks the group warm, so only follow-up tooltips enter instantly.
	let openedWarm = $state(false);
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
				openedWarm = group.warm;
				group.activate(id);
			} else {
				group.clear(id);
			}
		}
	});
	const tooltip = withInteractions(
		base,
		useInteractions([
			useHover(base.floatingContext, { openDelay: () => (group.warm ? 0 : delay) }),
			useRole(base.floatingContext, { role: 'tooltip' })
		])
	);

	onDestroy(() => {
		open = false;
		group.clear(id);
	});
</script>

{@render reference(tooltip)}
<Portal disabled={!portal}>
	{#if tooltip.isOpen()}
		<div
			{...tooltip.floating({ class: ['floating z-50 drop-shadow-lg', floatingClass] })}
			in:pop={{ duration: openedWarm ? 0 : undefined }}
			out:pop={{
				duration: group.activeId !== undefined && group.activeId !== id ? 0 : undefined
			}}
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
