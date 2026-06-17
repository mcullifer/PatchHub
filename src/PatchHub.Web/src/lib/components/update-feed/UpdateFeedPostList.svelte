<script lang="ts">
	import { Menu, MenuItem } from '$lib/components/common-ui';
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

<aside class="card card-sm bg-base-200 h-fit lg:sticky lg:top-20">
	<div class="card-body gap-4">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="card-title">{title}</h2>
				<p class="text-base-content/70">{description}</p>
			</div>
			<span class="badge badge-primary badge-soft">{items.length}</span>
		</div>

		<nav class="max-h-[32rem] overflow-y-auto" aria-label={ariaLabel}>
			<Menu class="w-full p-0">
				{#each items as item (item.id)}
					<MenuItem
						onclick={() => onselect(item.id)}
						class={[
							'w-full border-l-4 border-transparent text-left',
							item.isSelected && 'border-primary bg-base-300'
						]}
					>
						<span class="flex min-w-0 flex-col items-start">
							<time class="text-base-content/60 block text-sm">{item.dateLabel}</time>
							<strong class="mt-1 block line-clamp-2 font-semibold">{item.title}</strong>
							{#if item.summary}
								<p class="text-base-content/70 mt-2 line-clamp-2 text-sm leading-6">
									{item.summary}
								</p>
							{/if}
						</span>
					</MenuItem>
				{:else}
					<MenuItem>
						<div class="alert alert-info alert-soft">
							<span>{emptyMessage}</span>
						</div>
					</MenuItem>
				{/each}
			</Menu>
		</nav>
	</div>
</aside>
