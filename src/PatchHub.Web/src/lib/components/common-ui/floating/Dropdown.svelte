<script lang="ts">
	import type { DropdownProps } from '$lib/components/common-ui/floating';
	import { arrow, flip, offset } from '@floating-ui/dom';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import Portal from '../Portal.svelte';
	import FloatingArrow from './FloatingArrow.svelte';
	import {
		createFloating,
		useClick,
		useDismiss,
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

	let elemArrow = $state<SVGSVGElement | null>(null);
	let tipOpen = $state(false);
	const showTip = $derived(tipOpen && !dropdownOpen && tip !== undefined);

	const base = createFloating({
		open: () => dropdownOpen || showTip,
		opts: () => ({
			placement: 'bottom',
			...opts,
			middleware: [
				offset(showTip ? 6 : 2),
				...(opts?.middleware ?? [flip()]),
				...(showTip && elemArrow ? [arrow({ element: elemArrow })] : [])
			]
		}),
		defaultPlacement: 'bottom',
		onOpenChange: (value, event, reason) => {
			if (reason === 'hover') {
				tipOpen = dropdownOpen ? false : value;
				return;
			}

			tipOpen = false;

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
			useHover(base.floatingContext),
			useClick(base.floatingContext, { enabled: true, options: () => clickOpts }),
			useDismiss(base.floatingContext),
			useRole(base.floatingContext, { role: 'dialog' })
		])
	);
</script>

{@render activator(dropdown)}
<Portal disabled={!portal}>
	{#if dropdownOpen || showTip}
		<div
			{...dropdown.floating({
				class: ['floating drop-shadow-lg', dropdownOpen && 'z-[100]', showTip && 'z-[100]']
			})}
			transition:scale={{ easing: cubicOut, duration: 150 }}
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
