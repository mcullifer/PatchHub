<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import { EmptyState, Icon } from '$lib/components/common-ui';

	type ErrorDetails = {
		title: string;
		description: string;
		icon: string;
	};

	const details = $derived(getErrorDetails(page.status));

	function getErrorDetails(status: number): ErrorDetails {
		if (status === 404) {
			return {
				title: 'Page not found',
				description: "This page doesn't exist. It may have moved or never existed.",
				icon: 'explore_off'
			};
		}

		return {
			title: 'Something went wrong',
			description: 'An unexpected error occurred on our end. Try again in a moment.',
			icon: 'error'
		};
	}
</script>

<Seo title="{page.status} · {details.title} · PatchHub" noindex />

<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
	<EmptyState icon={details.icon} title={details.title} description={details.description}>
		<span class="badge badge-ghost font-mono">Error {page.status}</span>
		<a class="btn btn-primary btn-sm" href={resolve('/')}>
			<Icon icon="home" size="sm" />
			Go home
		</a>
	</EmptyState>
</section>
