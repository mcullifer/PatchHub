<script lang="ts">
	import ProjectHero from '$lib/components/projects/ProjectHero.svelte';
	import ProjectPostFeed from '$lib/components/projects/ProjectPostFeed.svelte';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const result = $derived(
		await getProjectPosts({ createdBy: params.createdBy, projectSlug: params.project })
	);
	const project = $derived(result.project);
	const posts = $derived(result.posts);
</script>

<svelte:head>
	<title>{project.name} - PatchHub</title>
</svelte:head>

<svelte:boundary>
	<div class="flex flex-col gap-3 sm:gap-4">
		<ProjectHero {project} createdBy={params.createdBy} projectSlug={params.project} />
		<ProjectPostFeed {project} {posts} createdBy={params.createdBy} />
	</div>

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
