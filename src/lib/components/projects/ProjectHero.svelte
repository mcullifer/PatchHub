<script lang="ts">
	import { FavoriteHeart, Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import { UpdateFeedHero } from '$lib/components/update-feed';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { addProjectFavorite, removeProjectFavorite } from '$lib/remote/favorites.remote';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';
	import { Time } from '$lib/util/time';

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
	const currentUser = getCurrentUser();
	const isOwner = $derived(currentUser()?.id === project.owner.id);
	const description = $derived(project.description ?? `Posts from ${project.owner.name}.`);

	// Keep the pending banner display fresh for every viewer until it resolves.
	$effect(() => {
		if (!isBannerPending) return;

		const timer = setInterval(() => {
			void projectQuery.refresh();
		}, Time.SECOND * 5);
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
						onToggle={toggleFavorite}
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
	</div>
</div>
