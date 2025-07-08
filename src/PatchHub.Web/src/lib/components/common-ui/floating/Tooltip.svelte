<script lang="ts">
	import type { TooltipProps } from '$lib/components/common-ui/floating/FloatingProps';
	import {
		FloatingArrow,
		arrow,
		autoUpdate,
		flip,
		offset,
		useDismiss,
		useFloating,
		useHover,
		useId,
		useInteractions,
		useRole
	} from '@skeletonlabs/floating-ui-svelte';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';

	const {
		reference,
		children,
		opts,
		floatingClass = '',
		arrowClass = '',
		delay = 0
	}: TooltipProps = $props();

	let open = $state(false);
	let elemArrow: HTMLElement | null = $state(null);
	const id = useId();

	const floating = useFloating({
		whileElementsMounted: autoUpdate,
		get open() {
			return open;
		},
		onOpenChange: (val) => {
			open = val;
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

	const role = useRole(floating.context);
	const hover = useHover(floating.context, { move: true, restMs: delay });
	const dismiss = useDismiss(floating.context);
	const interactions = useInteractions([role, hover, dismiss]);
</script>

{@render reference(floating, interactions)}
{#if open}
	<div
		bind:this={floating.elements.floating}
		style={floating.floatingStyles}
		{...interactions.getFloatingProps()}
		class={['floating z-50', floatingClass]}
	>
		<div transition:scale={{ easing: cubicOut, duration: 150 }} class="drop-shadow-lg">
			{@render children()}
			<FloatingArrow
				bind:ref={elemArrow}
				context={floating.context}
				class={['fill-neutral', arrowClass]}
			/>
		</div>
	</div>
{/if}
