<script lang="ts">
	import type { DropdownProps } from '$lib/components/common-ui/floating/FloatingProps';
	import {
		arrow,
		autoUpdate,
		flip,
		FloatingArrow,
		offset,
		useClick,
		useDismiss,
		useFloating,
		useHover,
		useId,
		useInteractions,
		useRole
	} from '@skeletonlabs/floating-ui-svelte';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';

	let {
		children,
		activator,
		tip,
		opts,
		open: dropdownOpen = $bindable(false),
		activatorClass = '',
		onDismiss
	}: DropdownProps & { onDismiss?: () => void } = $props();

	const id = useId();
	let elemArrow = $state<HTMLElement | null>(null);
	let tipOpen = $state(false);

	const floating = useFloating({
		whileElementsMounted: autoUpdate,
		get open() {
			return dropdownOpen;
		},
		onOpenChange: (val, event, reason) => {
			if (reason === 'hover') {
				tipOpen = dropdownOpen ? false : val;
			} else {
				dropdownOpen = !dropdownOpen;
				if (reason === 'outside-press' || reason === 'escape-key') {
					onDismiss?.();
				}
			}
		},
		nodeId: id,
		placement: 'bottom',
		...opts,
		get middleware() {
			return [
				offset(10),
				...(opts?.middleware ?? [flip()]),
				elemArrow && arrow({ element: elemArrow })
			];
		}
	});

	const role = useRole(floating.context);
	const hover = useHover(floating.context, { move: true });
	const click = useClick(floating.context);
	const dismiss = useDismiss(floating.context);
	const interactions = useInteractions([role, hover, click, dismiss]);

	$effect(() => {
		if (dropdownOpen) tipOpen = false;
	});
</script>

<div>
	<button
		bind:this={floating.elements.reference}
		{...interactions.getReferenceProps()}
		class={activatorClass}
	>
		{@render activator()}
	</button>
	{#if dropdownOpen || (tipOpen && tip)}
		<div
			bind:this={floating.elements.floating}
			style={floating.floatingStyles}
			{...interactions.getFloatingProps()}
			class={['floating', dropdownOpen && 'z-30', tipOpen && 'z-50']}
		>
			<div transition:scale={{ easing: cubicOut, duration: 150 }} class="drop-shadow-lg">
				{#if dropdownOpen}
					{@render children()}
				{:else if tipOpen}
					<div class="rounded-lg bg-neutral p-2 text-sm text-neutral-content">
						{@render tip?.()}
					</div>
				{/if}
				<FloatingArrow
					bind:ref={elemArrow}
					context={floating.context}
					class={{ 'fill-base-100': dropdownOpen, 'fill-neutral': tipOpen }}
				/>
			</div>
		</div>
	{/if}
</div>
