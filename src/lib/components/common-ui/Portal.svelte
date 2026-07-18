<script lang="ts">
	import { getAllContexts, mount, unmount, type Snippet } from 'svelte';

	let {
		children,
		disabled = false,
		target
	}: {
		children: Snippet;
		disabled?: boolean;
		target?: HTMLElement | string | null;
	} = $props();

	let resolvedTarget = $derived.by(resolvePortalTarget);
	let portalComponent: ReturnType<typeof mount> | undefined;
	const context = getAllContexts();

	function resolvePortalTarget() {
		if (typeof document === 'undefined') return null;
		if (disabled) return null;
		if (typeof target === 'string') return document.querySelector<HTMLElement>(target);
		return target ?? document.body;
	}

	$effect(() => {
		if (!resolvedTarget) return;

		portalComponent = mount(children, {
			target: resolvedTarget,
			context
		});

		return () => {
			const component = portalComponent;
			portalComponent = undefined;
			if (component) void unmount(component, { outro: true });
		};
	});
</script>

{#if disabled || !resolvedTarget}
	{@render children()}
{/if}
