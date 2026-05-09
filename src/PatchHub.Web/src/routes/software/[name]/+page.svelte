<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { SoftwareUpdateEntry } from '$lib/models/Software';
	import DOMPurify from 'dompurify';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);

	const dateFormatter = new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const selectedUpdate = $derived(getSelectedUpdate(data.detail.entries));
	const latestUpdateDate = $derived(formatDate(data.detail.health.latestItemAt));

	function getSelectedUpdate(entries: SoftwareUpdateEntry[]): SoftwareUpdateEntry | null {
		return entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
	}

	function isSelected(entry: SoftwareUpdateEntry, index: number): boolean {
		return selectedId === entry.id || (selectedId === null && index === 0);
	}

	function formatDate(value: string | null): string {
		if (!value) return 'Unknown';
		return dateFormatter.format(new Date(value));
	}

	function sanitizeHtml(html: string): string {
		if (typeof DOMPurify.sanitize !== 'function') {
			return html;
		}

		return DOMPurify.sanitize(html);
	}

	function openSource(url: string): void {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<svelte:head>
	<title>{data.detail.source.name}</title>
</svelte:head>

<div class="bg-base-100 min-h-full">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">
		<header class="card bg-base-200 border-base-300 overflow-hidden border shadow-sm">
			<div class="relative grid min-h-72 gap-0 lg:grid-cols-[minmax(320px,45%)_minmax(0,55%)]">
				<figure class="bg-base-300 relative min-h-56 overflow-hidden lg:min-h-full">
					<img
						class="h-full w-full object-cover"
						src={data.detail.source.imageUrl}
						alt={data.detail.source.imageAlt}
						loading="lazy"
					/>
					<div
						class="from-base-200/0 via-base-200/30 to-base-200 absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r"
					></div>
				</figure>

				<div class="card-body relative z-10 gap-5 p-4 sm:p-6 lg:p-8">
					<div class="flex flex-wrap items-center gap-2">
						<span class="badge badge-info badge-soft gap-1">
							<Icon icon={data.detail.source.icon} size="xs" />
							{data.detail.source.vendor}
						</span>
						<span class="badge bg-base-100/95 border-base-300 text-base-content shadow-sm">
							{data.detail.source.sourceType}
						</span>
						<span
							class={[
								'badge gap-1',
								data.detail.health.status === 'unavailable'
									? 'badge-error badge-soft'
									: 'badge-success badge-soft'
							]}
						>
							<Icon
								icon={data.detail.health.status === 'unavailable' ? 'cloud_off' : 'sync'}
								size="xs"
							/>
							{data.detail.health.status === 'fresh' ? 'Fresh' : data.detail.health.status}
						</span>
					</div>

					<div class="max-w-3xl">
						<h1 class="text-2xl leading-tight font-bold text-pretty md:text-3xl">
							{data.detail.source.name}
						</h1>
						<p class="text-base-content/80 mt-2 max-w-2xl text-sm">
							{data.detail.source.description}
						</p>
					</div>

					<div
						class="stats stats-vertical bg-base-100 border-base-300 sm:stats-horizontal w-full border shadow-sm"
					>
						<div class="stat px-4 py-3">
							<div class="stat-title">Latest update</div>
							<div class="stat-value text-lg">{latestUpdateDate}</div>
						</div>
						<div class="stat px-4 py-3">
							<div class="stat-title">Posts loaded</div>
							<div class="stat-value text-lg">{data.detail.entries.length}</div>
						</div>
						<div class="stat px-4 py-3">
							<div class="stat-title">Source</div>
							<div class="stat-value text-lg">{data.detail.source.provider}</div>
						</div>
					</div>

					{#if data.detail.health.error}
						<div class="alert alert-warning alert-soft">
							<Icon icon="warning" />
							<span>{data.detail.health.error}</span>
						</div>
					{/if}
				</div>
			</div>
		</header>

		<div class="grid min-h-0 gap-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
			<aside class="card bg-base-200 border-base-300 h-fit border shadow-sm lg:sticky lg:top-20">
				<div class="card-body gap-4 p-0">
					<div class="border-base-300 flex items-center justify-between gap-3 border-b px-4 py-3">
						<div>
							<h2 class="font-semibold">Updates</h2>
							<p class="text-base-content/60 text-sm">Newest posts from this source.</p>
						</div>
						<span class="badge badge-primary badge-soft">{data.detail.entries.length}</span>
					</div>

					<nav class="max-h-[38rem] overflow-y-auto" aria-label="Software updates">
						<ul class="menu menu-sm w-full gap-1 p-2">
							{#each data.detail.entries as entry, index (entry.id)}
								<li>
									<button
										type="button"
										class={[
											'rounded-box items-start gap-3 py-3 text-left',
											isSelected(entry, index) ? 'menu-active' : ''
										]}
										aria-current={isSelected(entry, index) ? 'true' : undefined}
										onclick={() => (selectedId = entry.id)}
									>
										<Icon
											icon={isSelected(entry, index) ? 'radio_button_checked' : 'article'}
											size="sm"
											class="mt-0.5 shrink-0"
										/>
										<span class="min-w-0 flex-1">
											<span class="text-xs opacity-60">{formatDate(entry.publishedAt)}</span>
											<span class="mt-1 line-clamp-2 font-medium text-pretty">
												{entry.title}
											</span>
											<span class="mt-1 line-clamp-2 text-xs opacity-60">
												{entry.summary}
											</span>
										</span>
									</button>
								</li>
							{:else}
								<div class="p-3">
									<div class="alert alert-info alert-soft">
										<Icon icon="info" />
										<span>This software source has no updates to show yet.</span>
									</div>
								</div>
							{/each}
						</ul>
					</nav>
				</div>
			</aside>

			<section class="min-w-0">
				{#if selectedUpdate}
					<article class="card bg-base-200 border-base-300 border shadow-sm">
						<div class="card-body gap-6 p-4 sm:p-6 lg:p-8">
							<header class="border-base-300 border-b pb-6">
								<div class="mb-3 flex flex-wrap items-center gap-2">
									<span class="badge badge-ghost gap-1">
										<Icon icon="calendar_month" size="xs" />
										{formatDate(selectedUpdate.publishedAt)}
									</span>
									{#if selectedUpdate.metadata.driverVersion}
										<span class="badge badge-outline">v{selectedUpdate.metadata.driverVersion}</span
										>
									{/if}
									{#if selectedUpdate.metadata.kbId}
										<span class="badge badge-outline">{selectedUpdate.metadata.kbId}</span>
									{/if}
									{#if selectedUpdate.metadata.windowsVersion}
										<span class="badge badge-outline">{selectedUpdate.metadata.windowsVersion}</span
										>
									{/if}
									{#if selectedUpdate.metadata.build}
										<span class="badge badge-outline">Build {selectedUpdate.metadata.build}</span>
									{/if}
								</div>

								<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
									<h2 class="max-w-4xl text-2xl leading-tight font-bold text-pretty md:text-4xl">
										{selectedUpdate.title}
									</h2>
									{#if selectedUpdate.sourceUrl}
										<button
											type="button"
											class="btn btn-primary btn-sm shrink-0 gap-2"
											onclick={() => openSource(selectedUpdate.sourceUrl)}
										>
											<Icon icon="open_in_new" size="sm" />
											Source
										</button>
									{/if}
								</div>
							</header>

							{#if selectedUpdate.contentHtml}
								<div
									class="prose prose-img:rounded-box prose-pre:bg-base-300 prose-pre:text-base-content prose-a:link prose-a:link-primary max-w-none"
								>
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html sanitizeHtml(selectedUpdate.contentHtml)}
								</div>
							{:else}
								<div class="alert alert-info alert-soft">
									<Icon icon="info" />
									<span>
										This source did not include article content. Open the source link to read the
										full update.
									</span>
								</div>
							{/if}
						</div>
					</article>
				{:else}
					<div class="hero bg-base-200 border-base-300 rounded-box min-h-96 border">
						<div class="hero-content text-center">
							<div class="max-w-md">
								<Icon icon="article" size="xl" class="text-base-content/40" />
								<h2 class="mt-4 text-xl font-semibold">No updates found</h2>
								<p class="text-base-content/60 mt-2">
									The source is configured, but no update posts were returned.
								</p>
							</div>
						</div>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>
