<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Icon, InView } from '$lib/components/common-ui';
	import { getSoftwareSourceSummaries } from '$lib/remote/software.remote';
	import type { ClassValue } from 'svelte/elements';

	let { class: classNames }: { class?: ClassValue } = $props();

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	function formatDate(value: string | null | undefined): string {
		if (!value) return 'No updates yet';
		return dateFormatter.format(new Date(value));
	}

	function getFreshnessLabel(value: string | null | undefined): string {
		if (!value) return 'Not checked';

		const date = new Date(value);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		if (isToday) return 'Updated today';

		return `Updated ${formatDate(value)}`;
	}
</script>

<section class={classNames}>
	<div class="mb-6">
		<div class="border-base-content/10 flex items-end justify-between border-b pb-4">
			<div>
				<h2 class="mb-1 flex items-center gap-3 text-2xl font-bold">
					<Icon icon="apps" size="md" />
					<span>Software</span>
				</h2>
				<p class="text-base-content/50 text-sm">Trackable update sources and release feeds</p>
			</div>
			<div class="badge badge-ghost badge-lg gap-2">
				<Icon icon="rss_feed" size="xs" />
				Sources
			</div>
		</div>
	</div>

	<svelte:boundary>
		{@const summaries = await getSoftwareSourceSummaries()}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each summaries as summary (summary.source.id)}
				<article class="card bg-base-200 border-base-300 card-sm border shadow-md">
					<figure class="bg-base-300 relative aspect-[460/215] overflow-hidden">
						<a data-sveltekit-preload-data="off" href={resolve(`/software/${summary.source.slug}`)}>
							<img
								class="h-full w-full object-cover duration-500 hover:scale-110"
								src={summary.source.imageUrl}
								alt={summary.source.imageAlt}
								loading="lazy"
							/>
						</a>
					</figure>
					<div class="card-body flex flex-col gap-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="mb-2 flex flex-wrap items-center gap-2">
									<span class="badge badge-info badge-soft gap-1">
										<Icon icon={summary.source.icon} size="xs" />
										{summary.source.vendor}
									</span>
									<span class="badge badge-ghost">{summary.source.sourceType}</span>
								</div>
								<h3 class="text-lg leading-tight font-semibold">
									<a
										data-sveltekit-preload-data="off"
										class="link-hover link"
										href={resolve(`/software/${summary.source.slug}`)}
									>
										{summary.source.name}
									</a>
								</h3>
							</div>
							{#if page.data.user !== null}
								<label class="swap">
									<input type="checkbox" data-tip="Favorite" class="tooltip" />
									<Icon icon="favorite" style="outlined" class="swap-off" />
									<Icon icon="favorite" class="swap-on text-pink-500" />
								</label>
							{/if}
						</div>

						<div>
							{#if summary.latestUpdate}
								<div class="space-y-2">
									<p class="line-clamp-2 text-sm font-medium text-pretty">
										{summary.latestUpdate.title}
									</p>
									<div class="flex flex-wrap gap-2">
										{#if summary.latestUpdate.metadata.driverVersion}
											<span class="badge badge-outline badge-sm">
												v{summary.latestUpdate.metadata.driverVersion}
											</span>
										{/if}
										{#if summary.latestUpdate.metadata.kbId}
											<span class="badge badge-outline badge-sm">
												{summary.latestUpdate.metadata.kbId}
											</span>
										{/if}
										{#if summary.latestUpdate.metadata.windowsVersion}
											<span class="badge badge-outline badge-sm">
												{summary.latestUpdate.metadata.windowsVersion}
											</span>
										{/if}
										{#if summary.latestUpdate.metadata.build}
											<span class="badge badge-outline badge-sm">
												Build {summary.latestUpdate.metadata.build}
											</span>
										{/if}
									</div>
								</div>
							{:else}
								<div class="alert alert-info alert-soft py-2 text-sm">
									<Icon icon="info" size="sm" />
									<span>No updates returned yet.</span>
								</div>
							{/if}
						</div>

						<div class="text-base-content/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
							<span class="inline-flex items-center gap-1">
								<Icon icon="calendar_month" size="xs" />
								{formatDate(summary.latestUpdate?.publishedAt)}
							</span>
							<span class="inline-flex items-center gap-1">
								<Icon
									icon={summary.health.status === 'unavailable' ? 'cloud_off' : 'sync'}
									size="xs"
								/>
								{summary.health.status === 'unavailable'
									? 'Source unavailable'
									: getFreshnessLabel(summary.health.latestItemAt)}
							</span>
						</div>
					</div>
				</article>
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
	</svelte:boundary>
</section>
