<script lang="ts">
	import { page } from '$app/state';
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import { UpdateFeedHero } from '$lib/components/update-feed';
	import { addProjectFavorite, removeProjectFavorite } from '$lib/remote/favorites.remote';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';

	type Project = Awaited<ReturnType<typeof getProjectPosts>>['project'];

	let {
		project,
		createdBy,
		projectSlug,
		isFavorited,
		onEditProject
	}: {
		project: Project;
		createdBy: string;
		projectSlug: string;
		isFavorited: boolean;
		onEditProject?: () => void;
	} = $props();

	let optimisticFavorited = $state<boolean | null>(null);
	const favorited = $derived(optimisticFavorited ?? isFavorited);

	let isTogglingFavorite = false;

	async function toggleFavorite(): Promise<void> {
		if (isTogglingFavorite) return;
		isTogglingFavorite = true;

		const next = !favorited;
		optimisticFavorited = next;
		try {
			await (next ? addProjectFavorite(project.id) : removeProjectFavorite(project.id));
		} catch {
			optimisticFavorited = !next;
		} finally {
			isTogglingFavorite = false;
		}
	}

	const projectQuery = $derived(getProjectPosts({ createdBy, projectSlug }));
	const bannerUrl = $derived(project.banner.url);
	const isBannerPending = $derived(project.banner.status === 'pending');
	const description = $derived(project.description ?? `Posts from ${project.ownerName}.`);

	// Keep the pending banner display fresh for every viewer until it resolves.
	$effect(() => {
		if (!isBannerPending) return;

		const timer = setInterval(() => {
			void projectQuery.refresh();
		}, 5000);
		return () => clearInterval(timer);
	});
</script>

<div class="relative">
	<UpdateFeedHero
		title={project.name}
		{description}
		imageUrl={bannerUrl}
		imageAlt={bannerUrl ? `${project.name} banner` : ''}
		imagePending={isBannerPending}
	>
		{#snippet fallbackIcon()}
			<Icon icon="image" size="xl" class="text-base-content/30" />
		{/snippet}
	</UpdateFeedHero>

	<div class="absolute top-3 right-3 z-10 flex items-center gap-2">
		{#if project.isOwner && onEditProject}
			<Tooltip>
				{#snippet reference(floating)}
					<button
						type="button"
						aria-label="Edit project"
						{...floating.reference({
							class: ['bg-neutral/50 text-neutral-content grid place-items-center rounded-full p-1']
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

		{#if page.data.user !== null}
			<Tooltip>
				{#snippet reference(floating)}
					<FavoriteHeart
						{favorited}
						onToggle={toggleFavorite}
						{...floating.reference({
							class: ['bg-neutral/50 text-neutral-content rounded-full p-1']
						})}
					/>
				{/snippet}
				<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
					Favorite
				</div>
			</Tooltip>
		{/if}
	</div>
</div>
