<script lang="ts">
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import { UpdateFeedHero } from '$lib/components/update-feed';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { useFavorites } from '$lib/contexts/favorites.svelte';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';

	type Project = Awaited<ReturnType<typeof getProjectPosts>>['project'];

	let {
		project,
		onEditProject
	}: {
		project: Project;
		onEditProject?: () => void;
	} = $props();

	const favorites = useFavorites();
	const favorited = $derived(favorites.isProjectFavorited(project.id));

	const currentUser = getCurrentUser();
	const isOwner = $derived(currentUser()?.id === project.owner.id);
	const description = $derived(project.description ?? `Posts from ${project.owner.name}.`);
</script>

<UpdateFeedHero
	title={project.name}
	{description}
	imageUrl={project.bannerUrl}
	imageAlt={project.bannerUrl ? `${project.name} banner` : ''}
>
	{#snippet fallbackIcon()}
		<Icon icon="image" size="xl" class="text-base-content/30" />
	{/snippet}

	{#snippet overlay()}
		{#if isOwner && onEditProject}
			<Tooltip>
				{#snippet reference(floating)}
					<button
						type="button"
						aria-label="Edit project"
						{...floating.reference({
							class: ['btn btn-circle btn-sm']
						})}
						onclick={onEditProject}
					>
						<Icon icon="edit" size="sm" />
					</button>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Edit project
				</div>
			</Tooltip>
		{/if}

		{#if currentUser() !== null}
			<Tooltip>
				{#snippet reference(floating)}
					<FavoriteHeart
						{favorited}
						onToggle={() => favorites.toggleProject(project.id)}
						{...floating.reference({
							class: ['btn-sm']
						})}
					/>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Favorite
				</div>
			</Tooltip>
		{/if}
	{/snippet}
</UpdateFeedHero>
