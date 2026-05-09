<script lang="ts">
	import { Icon } from '$lib/components/common-ui';

	let {
		title,
		description,
		icon = 'article'
	}: {
		title: string;
		description: string;
		icon?: string;
	} = $props();
</script>

<div class="hero bg-base-200 border-base-300 rounded-box min-h-96 border">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<Icon {icon} size="xl" class="text-base-content/40" />
			<h2 class="mt-4 text-xl font-semibold">{title}</h2>
			<p class="text-base-content/60 mt-2">
				{description}
			</p>
		</div>
	</div>
</div>
