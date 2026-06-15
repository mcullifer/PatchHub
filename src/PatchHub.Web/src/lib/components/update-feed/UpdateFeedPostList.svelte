<script lang="ts">
	import type { UpdateFeedPostListItem } from './UpdateFeedTypes';

	let {
		title,
		description,
		ariaLabel,
		items,
		emptyMessage,
		onselect
	}: {
		title: string;
		description: string;
		ariaLabel: string;
		items: UpdateFeedPostListItem[];
		emptyMessage: string;
		onselect: (id: string) => void;
	} = $props();
</script>

<aside class="card bg-base-200 border-base-300 h-fit border lg:sticky lg:top-20">
	<div class="card-body gap-0 p-0">
		<div class="border-base-300 flex items-start justify-between gap-3 border-b px-4 py-3">
			<div>
				<h2 class="font-semibold">{title}</h2>
				<p class="text-base-content/60 text-sm">{description}</p>
			</div>
			<span class="text-base-content/50 text-sm tabular-nums">{items.length}</span>
		</div>

		<nav class="max-h-[38rem] overflow-y-auto" aria-label={ariaLabel}>
			<ul class="divide-base-300 divide-y">
				{#each items as item (item.id)}
					<li>
						<button
							type="button"
							class={[
								'hover:bg-base-300/70 focus-visible:outline-primary flex w-full border-l-2 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
								item.isSelected ? 'bg-base-300 border-primary' : 'border-transparent'
							]}
							aria-current={item.isSelected ? 'true' : undefined}
							onclick={() => onselect(item.id)}
						>
							<span class="min-w-0 flex-1">
								<span class="text-base-content/50 text-xs">{item.dateLabel}</span>
								<span class="mt-1 line-clamp-2 text-sm font-medium text-pretty">
									{item.title}
								</span>
								<span class="text-base-content/60 mt-1 line-clamp-2 text-xs leading-5">
									{item.summary}
								</span>
							</span>
						</button>
					</li>
				{:else}
					<div class="p-3">
						<div class="alert alert-info alert-soft">
							<span>{emptyMessage}</span>
						</div>
					</div>
				{/each}
			</ul>
		</nav>
	</div>
</aside>
