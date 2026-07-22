<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import ProjectFormModal from '$lib/components/projects/ProjectFormModal.svelte';
	import ProjectHero from '$lib/components/projects/ProjectHero.svelte';
	import ProjectPostFeed from '$lib/components/projects/ProjectPostFeed.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = getCurrentUser();
	const result = $derived(
		await getProjectPosts({ createdBy: params.createdBy, projectSlug: params.project })
	);
	const project = $derived(result.project);
	const posts = $derived(result.posts);
	const isOwner = $derived(currentUser()?.id === project.owner.id);

	let editModal = $state<{ open: () => void } | null>(null);
</script>

<Seo
	title="{project.name} - PatchHub"
	description={project.description ??
		`Follow ${project.name} for the latest patch notes and updates on PatchHub.`}
	image={project.banner.status === 'ready' ? project.banner.url : undefined}
/>

<svelte:boundary>
	<div class="flex flex-col gap-3 sm:gap-4">
		<ProjectHero
			{project}
			createdBy={params.createdBy}
			projectSlug={params.project}
			onEditProject={() => editModal?.open()}
		/>
		<ProjectPostFeed {project} {posts} createdBy={params.createdBy} />
	</div>

	{#if isOwner}
		<ProjectFormModal
			bind:this={editModal}
			mode={{
				kind: 'edit',
				project,
				createdBy: params.createdBy,
				projectSlug: params.project
			}}
		/>
	{/if}

	{#snippet pending()}
		<div class="flex flex-col gap-3 sm:gap-4">
			<div class="skeleton h-40 w-full sm:h-48"></div>
			<div class="grid gap-3 sm:gap-4 lg:grid-cols-4">
				<div class="skeleton hidden h-64 lg:block"></div>
				<div class="skeleton h-96 lg:col-span-3"></div>
			</div>
		</div>
	{/snippet}
</svelte:boundary>
