<script lang="ts">
	import ProjectHero from '$lib/components/projects/ProjectHero.svelte';
	import ProjectPostFeed from '$lib/components/projects/ProjectPostFeed.svelte';
	import { getProjectNotes } from '$lib/remote/patchNotes.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const result = $derived(
		await getProjectNotes({ createdBy: params.createdBy, projectSlug: params.project })
	);
	const project = $derived(result.project);
	const notes = $derived(result.notes);
</script>

<svelte:head>
	<title>{project.name} - PatchHub</title>
</svelte:head>

<svelte:boundary>
	<div class="flex flex-col gap-3 sm:gap-4">
		<ProjectHero {project} createdBy={params.createdBy} projectSlug={params.project} />
		<ProjectPostFeed {project} {notes} createdBy={params.createdBy} />
	</div>

	{#snippet pending()}
		<div class="flex justify-center py-16">
			<span class="loading loading-spinner loading-lg" aria-label="Loading"></span>
		</div>
	{/snippet}
</svelte:boundary>
