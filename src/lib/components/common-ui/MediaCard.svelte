<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		href,
		title,
		description = null,
		actionLabel,
		size = 'md',
		class: className,
		media,
		meta,
		topLeft,
		topRight
	}: {
		href: string;
		title: string;
		description?: string | null;
		actionLabel?: string;
		size?: 'md' | 'lg';
		class?: ClassValue;
		media: Snippet;
		meta?: Snippet;
		topLeft?: Snippet;
		topRight?: Snippet;
	} = $props();
</script>

<article
	class={[
		'group bg-base-300 rounded-box ring-base-content/20 relative overflow-hidden shadow-md ring-1',
		className
	]}
>
	<div
		class={[
			'absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:duration-[350ms] motion-reduce:group-hover:scale-100',
			size === 'lg' ? 'group-hover:scale-[1.025]' : 'group-hover:scale-[1.04]'
		]}
	>
		{@render media()}
	</div>

	<div
		class="from-neutral via-neutral/40 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent"
	></div>

	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		data-sveltekit-preload-data="off"
		{href}
		class="rounded-box focus-visible:outline-primary absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
		aria-label={title}
	></a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if topLeft}
		<div class="absolute top-4 left-4">
			{@render topLeft()}
		</div>
	{/if}

	{#if topRight}
		<div class="absolute top-2 right-2">
			{@render topRight()}
		</div>
	{/if}

	<div
		class="text-neutral-content pointer-events-none absolute inset-x-0 bottom-0 flex flex-col p-4"
	>
		<h3
			class={[
				'leading-tight font-semibold tracking-tight',
				size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-base'
			]}
		>
			{title}
		</h3>
		{#if description}
			<p class="mt-0.5 line-clamp-1 text-sm leading-snug opacity-90">{description}</p>
		{/if}
		{#if meta || actionLabel}
			<div class="mt-2 flex items-center gap-2">
				{@render meta?.()}
				{#if actionLabel}
					<span
						class="badge badge-primary badge-sm ml-auto shrink-0 translate-y-1 gap-1 opacity-0 transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0"
					>
						{actionLabel}
						<Icon icon="arrow_forward" size="xs" />
					</span>
				{/if}
			</div>
		{/if}
	</div>
</article>
