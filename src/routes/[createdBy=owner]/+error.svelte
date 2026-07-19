<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import { EmptyState, Icon } from '$lib/components/common-ui';

	type OwnerRouteErrorParams = {
		createdBy?: string;
		project?: string;
		post?: string;
	};

	type OwnerRouteErrorDetails = {
		title: string;
		description: string;
		icon: string;
		showOwnerLink: boolean;
	};

	const details = $derived(
		getOwnerRouteErrorDetails(page.status, page.params, page.error?.message)
	);

	function getOwnerRouteErrorDetails(
		status: number,
		params: OwnerRouteErrorParams,
		message: string | undefined
	): OwnerRouteErrorDetails {
		if (status === 404 && params.post) {
			return {
				title: 'Post not found',
				description: 'That post does not exist or is not visible.',
				icon: 'search_off',
				showOwnerLink: params.createdBy !== undefined
			};
		}

		if (status === 404 && params.project) {
			return {
				title: 'Project not found',
				description: 'That project does not exist or is not visible.',
				icon: 'folder_off',
				showOwnerLink: params.createdBy !== undefined
			};
		}

		if (status === 404) {
			return {
				title: 'Owner not found',
				description: `No PatchHub user or organization exists for "${params.createdBy ?? 'this owner'}".`,
				icon: 'person_off',
				showOwnerLink: false
			};
		}

		return {
			title: 'Unable to load this page',
			description: message ?? 'Something went wrong while loading this PatchHub page.',
			icon: 'error',
			showOwnerLink: false
		};
	}
</script>

<Seo title="{details.title} - PatchHub" noindex />

<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
	<EmptyState icon={details.icon} title={details.title} description={details.description}>
		{#if details.showOwnerLink && page.params.createdBy}
			<a
				class="btn btn-primary btn-sm"
				href={resolve('/[createdBy=owner]', { createdBy: page.params.createdBy })}
			>
				<Icon icon="person" size="sm" />
				View owner
			</a>
			<a class="btn btn-ghost btn-sm" href={resolve('/')}>
				<Icon icon="home" size="sm" />
				Go home
			</a>
		{:else}
			<a class="btn btn-primary btn-sm" href={resolve('/')}>
				<Icon icon="home" size="sm" />
				Go home
			</a>
		{/if}
	</EmptyState>
</section>
