<script lang="ts">
	import type { DropdownProps } from '$lib/components/common-ui/floating';
	import { arrow, flip, offset } from '@floating-ui/dom';
	import { onDestroy } from 'svelte';
	import { pop } from '$lib/util/transitions';
	import { TOOLTIP_DELAY_MS } from './FloatingProps';
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
		children,
		activator,
		tip,
		opts,
		clickOpts,
		open: dropdownOpen = $bindable(false),
		portal = true
	}: DropdownProps = $props();

	const group = useFloatingGroup('tooltip');
	const id = $props.id();
	let elemArrow = $state<SVGSVGElement | null>(null);
	let tipOpen = $state(false);
	// Captured before activate() marks the group warm, so only follow-up tooltips enter instantly.
	let openedWarm = $state(false);
	const showTip = $derived(tipOpen && !dropdownOpen && tip !== undefined && group.activeId === id);

	// Keep the last surface's middleware while its outro remains in the DOM.
	let lastVisibleSurface = $state<'dropdown' | 'tip'>('dropdown');

	function getPositioningSurface() {
		if (dropdownOpen) lastVisibleSurface = 'dropdown';
		else if (showTip) lastVisibleSurface = 'tip';
		return lastVisibleSurface;
	}

	const base = createFloating({
		open: () => dropdownOpen || showTip,
		opts: () => {
			const isTip = getPositioningSurface() === 'tip';

			return {
				placement: 'bottom',
				...opts,
				middleware: [
					offset(isTip ? 6 : 2),
					...(opts?.middleware ?? [flip()]),
					...(isTip && elemArrow ? [arrow({ element: elemArrow })] : [])
				]
			};
		},
		defaultPlacement: 'bottom',
		onOpenChange: (value, event, reason) => {
			if (reason === 'hover') {
				if (dropdownOpen) {
					tipOpen = false;
					return;
				}
				if (value) {
					openedWarm = group.warm;
					group.activate(id);
				} else {
					group.clear(id);
				}
				tipOpen = value;
				return;
			}

			tipOpen = false;
			group.clear(id);

			if (reason === 'click') {
				const nextOpen = !dropdownOpen;
				if (showTip && nextOpen) {
					queueMicrotask(() => {
						dropdownOpen = true;
					});
					return;
				}

				dropdownOpen = nextOpen;
				return;
			}

			dropdownOpen = value;
		}
	});
	const dropdown = withInteractions(
		base,
		useInteractions([
			useHover(base.floatingContext, {
				openDelay: () => (group.warm ? 0 : TOOLTIP_DELAY_MS)
			}),
			useClick(base.floatingContext, { enabled: true, options: () => clickOpts }),
			useDismiss(base.floatingContext),
			useRole(base.floatingContext, { role: 'dialog' })
		])
	);

	onDestroy(() => group.clear(id));
</script>

{@render activator(dropdown)}
<Portal disabled={!portal}>
	{#if dropdownOpen || showTip}
		<div
			{...dropdown.floating({
				class: ['floating drop-shadow-lg', dropdownOpen && 'z-[100]', showTip && 'z-[100]']
			})}
			in:pop={{ duration: showTip && openedWarm ? 0 : undefined }}
			out:pop={{
				duration:
					lastVisibleSurface === 'tip' && group.activeId !== undefined && group.activeId !== id
						? 0
						: undefined
			}}
		>
			{#if dropdownOpen}
				{@render children()}
			{:else if showTip}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm">
					{@render tip?.()}
				</div>
			{/if}
			{#if showTip}
				<FloatingArrow bind:ref={elemArrow} context={dropdown.context} class="fill-neutral" />
			{/if}
		</div>
	{/if}
</Portal>
