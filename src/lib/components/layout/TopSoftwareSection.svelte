<script lang="ts">
	import { Icon, InView } from '$lib/components/common-ui';
	import SectionHeader from '$lib/components/layout/SectionHeader.svelte';
	import SoftwareCard from '$lib/components/layout/SoftwareCard.svelte';
	import { getSoftwareSourceSummaries } from '$lib/remote/software.remote';
	import type { ClassValue } from 'svelte/elements';

	let { class: className }: { class?: ClassValue } = $props();
</script>

<section class={className}>
	<SectionHeader title="Software">
		{#snippet attribution()}
			<Icon icon="rss_feed" size="xs" />
			Vendor & release feeds
		{/snippet}
	</SectionHeader>

	<svelte:boundary>
		{@const summaries = await getSoftwareSourceSummaries()}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each summaries as summary (summary.source.id)}
				<SoftwareCard {summary} />
			{:else}
				<div class="alert alert-info alert-soft">
					<Icon icon="info" />
					<span>No software sources are configured yet.</span>
				</div>
			{/each}
			<InView
				opts={{ rootMargin: '50px' }}
				onInviewChange={(e) => e.detail.observer.disconnect()}
			/>
		</div>
		{#snippet failed()}
			<div class="alert alert-error shadow-sm">
				<Icon icon="error" />
				<span>Software sources could not be loaded.</span>
			</div>
		{/snippet}

		{#snippet pending()}
			<div
				class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
				role="status"
				aria-busy="true"
			>
				<span class="sr-only">Loading software</span>
				{#each [1, 2, 3] as placeholder (placeholder)}
					<div class="skeleton aspect-[1200/630]"></div>
				{/each}
			</div>
		{/snippet}
	</svelte:boundary>
</section>
