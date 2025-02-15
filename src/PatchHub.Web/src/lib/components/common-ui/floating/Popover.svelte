<script lang="ts" module>
	let openedPopoverId = $state<string>();
</script>

<script lang="ts">
	import type { PopoverProps } from '$lib/components/common-ui/floating/FloatingProps';
	import {
		FloatingArrow,
		arrow,
		autoUpdate,
		flip,
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
		reference,
		children,
		open = $bindable(false),
		openOn = ['click'],
		closeOn = ['outside-press', 'escape-key', 'click'],
		opts,
		onclick,
		referenceClass = '',
		floatingClass = ''
	}: PopoverProps = $props();

	// State
	let elemArrow: HTMLElement | null = $state(null);
	const id = useId();

	// Use Floating
	const floating = useFloating({
		whileElementsMounted: autoUpdate,
		get open() {
			return open;
		},
		onOpenChange: (val, event, reason) => {
			if (!reason) return;
			const shouldOpen = val && openOn.includes(reason);
			const shouldClose = !val && closeOn.includes(reason);
			if (shouldOpen || shouldClose) {
				open = val;
				openedPopoverId = val ? id : undefined;
			}
		},
		nodeId: id,
		placement: 'top',
		...opts,
		get middleware() {
			return [
				offset(10),
				...(opts?.middleware ?? [flip()]),
				elemArrow && arrow({ element: elemArrow })
			];
		}
	});

	// Interactions
	const role = useRole(floating.context);
	const hover = useHover(floating.context, { move: true, restMs: 200 });
	const click = useClick(floating.context);
	const dismiss = useDismiss(floating.context);
	const interactions = useInteractions(
		openOn.includes('hover') ? [role, hover, click, dismiss] : [role, click, dismiss]
	);

	$effect(() => {
		if (openedPopoverId !== id) {
			open = false;
		}
	});
</script>

<div>
	<!-- Reference Element -->
	<button
		bind:this={floating.elements.reference}
		{...interactions.getReferenceProps({ onclick: onclick })}
		class={[referenceClass]}
	>
		{@render reference()}
	</button>
	<!-- Floating Element -->
	{#if open}
		<div
			bind:this={floating.elements.floating}
			style={floating.floatingStyles}
			{...interactions.getFloatingProps()}
			class={['floating z-50', floatingClass]}
		>
			<div transition:scale={{ easing: cubicOut, duration: 150 }} class="drop-shadow-lg">
				{@render children()}
				<FloatingArrow bind:ref={elemArrow} context={floating.context} class="fill-base-100" />
			</div>
		</div>
	{/if}
</div>
