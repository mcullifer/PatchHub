<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
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

<aside class="card bg-base-200 border-base-300 h-fit border shadow-sm lg:sticky lg:top-20">
	<div class="card-body gap-4 p-0">
		<div class="border-base-300 flex items-center justify-between gap-3 border-b px-4 py-3">
			<div>
				<h2 class="font-semibold">{title}</h2>
				<p class="text-base-content/60 text-sm">{description}</p>
			</div>
			<span class="badge badge-primary badge-soft">{items.length}</span>
		</div>

		<nav class="max-h-[38rem] overflow-y-auto" aria-label={ariaLabel}>
			<ul class="menu menu-sm w-full gap-1 p-2">
				{#each items as item (item.id)}
					<li>
						<button
							type="button"
							class={[
								'rounded-box items-start gap-3 py-3 text-left',
								item.isSelected ? 'menu-active' : ''
							]}
							aria-current={item.isSelected ? 'true' : undefined}
							onclick={() => onselect(item.id)}
						>
							<Icon icon={item.icon} size="sm" class="mt-0.5 shrink-0" />
							<span class="min-w-0 flex-1">
								<span class="text-xs opacity-60">{item.dateLabel}</span>
								<span class="mt-1 line-clamp-2 font-medium text-pretty">
									{item.title}
								</span>
								<span class="mt-1 line-clamp-2 text-xs opacity-60">
									{item.summary}
								</span>
							</span>
						</button>
					</li>
				{:else}
					<div class="p-3">
						<div class="alert alert-info alert-soft">
							<Icon icon="info" />
							<span>{emptyMessage}</span>
						</div>
					</div>
				{/each}
			</ul>
		</nav>
	</div>
</aside>
