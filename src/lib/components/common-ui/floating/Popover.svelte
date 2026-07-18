<script lang="ts">
	import type { PopoverProps } from '$lib/components/common-ui/floating';
	import { arrow, flip, offset } from '@floating-ui/dom';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import Portal from '../Portal.svelte';
	import FloatingArrow from './FloatingArrow.svelte';
	import {
		createFloating,
		useClick,
		useDismiss,
		useFloatingGroup,
		useHover,
		useInteractions,
		useRole,
		withInteractions
	} from './floating.svelte';

	let {
		reference,
		children,
		open = $bindable(false),
		openOn = ['click'],
		closeOn = ['outside-press', 'escape-key', 'click'],
		opts,
		clickOpts,
		floatingClass = '',
		arrowClass = 'fill-base-100',
		arrowBorderClass = '',
		portal = true
	}: PopoverProps = $props();

	let elemArrow: SVGSVGElement | null = $state(null);
	const group = useFloatingGroup('popover');
	const id = $props.id();
	const effectiveOpen = $derived(open && group.activeId === id);

	const base = createFloating({
		open: () => effectiveOpen,
		opts: () => ({
			placement: 'top',
			...opts,
			middleware: [
				offset(10),
				...(opts?.middleware ?? [flip()]),
				elemArrow && arrow({ element: elemArrow })
			]
		}),
		defaultPlacement: 'top',
		onOpenChange: (value, event, reason) => {
			const shouldOpen = value && openOn.includes(reason);
			const shouldClose = !value && closeOn.includes(reason);
			if (shouldOpen || shouldClose) {
				open = value;
				if (value) {
					group.activate(id);
				} else {
					group.clear(id);
				}
			}
		}
	});
	const popover = withInteractions(
		base,
		useInteractions([
			useHover(base.floatingContext, { enabled: () => openOn.includes('hover') }),
			useClick(base.floatingContext, { enabled: true, options: () => clickOpts }),
			useDismiss(base.floatingContext),
			useRole(base.floatingContext, { role: 'dialog' })
		])
	);
</script>

{@render reference(popover)}
<Portal disabled={!portal}>
	{#if popover.isOpen()}
		<div
			{...popover.floating({ class: ['floating z-50 drop-shadow-lg', floatingClass] })}
			transition:scale={{ easing: cubicOut, duration: 150 }}
		>
			{@render children()}
			<FloatingArrow
				bind:ref={elemArrow}
				context={popover.context}
				class={arrowClass}
				borderClass={arrowBorderClass}
			/>
		</div>
	{/if}
</Portal>
