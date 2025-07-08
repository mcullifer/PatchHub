<script lang="ts">
	import { Card, Icon } from '$lib/components/common-ui';
	import { inview } from 'svelte-inview';
	import type { ClassValue } from 'svelte/elements';

	let { class: classNames }: { class?: ClassValue } = $props();
	// let maxVisible = $state(10);
</script>

<section class="prose max-w-none {classNames}">
	<h2 class="flex items-center gap-2">
		<Icon icon="apps" />
		Software
	</h2>
	<div class="not-prose gap-4 max-sm:flex max-sm:flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3">
		<Card class="card-border bg-base-300 shadow-lg">
			{#snippet title()}
				<div class="flex w-full justify-between">
					<a href={`/software/${'windows11'}`} class="link-hover link">Windows 11</a>
					<label class="swap">
						<input type="checkbox" data-tip="Favorite" class="tooltip" />
						<Icon icon="favorite" style="outlined" class="swap-off " />
						<Icon icon="favorite" class="swap-on text-pink-500" />
					</label>
				</div>
			{/snippet}
		</Card>
		<div
			class="sentinel"
			use:inview={{
				rootMargin: '50px'
			}}
			oninview_change={(e) => {
				// if (maxVisible >= software.software.items.length) {
				// 	e.detail.observer.disconnect();
				// }
				// maxVisible += 10;
				e.detail.observer.disconnect();
			}}
		></div>
	</div>
</section>
