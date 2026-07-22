<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import ProjectPostForm, {
		type ProjectPostFormPayload
	} from '$lib/components/ProjectPostForm.svelte';
	import {
		createProjectPost,
		getOwnedProject,
		getProjectPosts
	} from '$lib/remote/projectPosts.remote';
	import type { PageProps } from './$types';

	type ProjectPostStatus = 'draft' | 'published';

	let { params }: PageProps = $props();

	const project = $derived(
		await getOwnedProject({ createdBy: params.createdBy, projectSlug: params.project })
	);

	async function save(status: ProjectPostStatus, payload: ProjectPostFormPayload): Promise<void> {
		const projectPost = await createProjectPost({
			projectId: project.id,
			kind: payload.kind,
			title: payload.title,
			content: payload.content,
			status
		}).updates(getProjectPosts({ createdBy: params.createdBy, projectSlug: params.project }));

		if (status === 'published') {
			await goto(
				resolve('/[createdBy=owner]/[project]/[post]', {
					createdBy: params.createdBy,
					project: project.slug,
					post: projectPost.slug
				})
			);
			return;
		}

		await goto(
			resolve('/[createdBy=owner]/[project]', {
				createdBy: params.createdBy,
				project: project.slug
			})
		);
	}
</script>

<Seo title="New post - {project.name}" noindex />

<svelte:boundary>
	<ProjectPostForm
		fallbackErrorMessage="Unable to create post"
		actions={[
			{
				id: 'draft',
				label: 'Save draft',
				class: 'btn-soft',
				run: (payload) => save('draft', payload)
			},
			{
				id: 'published',
				label: 'Publish',
				class: 'btn-primary',
				run: (payload) => save('published', payload)
			}
		]}
	/>

	{#snippet pending()}
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
			<div class="skeleton h-8 w-56"></div>
			<div class="skeleton h-12 w-full"></div>
			<div class="skeleton h-80 w-full"></div>
		</div>
	{/snippet}
</svelte:boundary>
