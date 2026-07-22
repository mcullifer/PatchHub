<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import ProjectPostForm, {
		type ProjectPostFormAction,
		type ProjectPostFormContent,
		type ProjectPostFormPayload
	} from '$lib/components/ProjectPostForm.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import {
		getProjectPost,
		getProjectPosts,
		setProjectPostStatus,
		updateProjectPost
	} from '$lib/remote/projectPosts.remote';
	import { error } from '@sveltejs/kit';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const currentUser = getCurrentUser();
	const postQuery = $derived(
		getProjectPost({
			createdBy: params.createdBy,
			projectSlug: params.project,
			postSlug: params.post
		})
	);
	const postsQuery = $derived(
		getProjectPosts({ createdBy: params.createdBy, projectSlug: params.project })
	);
	const result = $derived(await postQuery);
	const project = $derived(result.project);
	const post = $derived(getOwnedPost());
	const parsedContent = $derived(parseContent(post.content));
	const actions = $derived(buildActions(post.status));

	function getOwnedPost() {
		if (currentUser()?.id !== result.project.owner.id) error(404, 'Not found');
		return result.post;
	}

	function parseContent(content: string): ProjectPostFormContent | undefined {
		try {
			return JSON.parse(content) as ProjectPostFormContent;
		} catch {
			return undefined;
		}
	}

	async function update(payload: ProjectPostFormPayload): Promise<void> {
		await updateProjectPost({
			postId: post.id,
			kind: payload.kind,
			title: payload.title,
			content: payload.content
		}).updates(postQuery, postsQuery);
	}

	async function gotoPost(): Promise<void> {
		await goto(
			resolve('/[createdBy=owner]/[project]/[post]', {
				createdBy: params.createdBy,
				project: project.slug,
				post: post.slug
			})
		);
	}

	function buildActions(status: 'draft' | 'published' | 'archived'): ProjectPostFormAction[] {
		if (status === 'draft') {
			return [
				{
					id: 'draft',
					label: 'Save draft',
					class: 'btn-soft',
					run: async (payload) => {
						await update(payload);
						await gotoPost();
					}
				},
				{
					id: 'published',
					label: 'Publish',
					class: 'btn-primary',
					run: async (payload) => {
						await update(payload);
						await setProjectPostStatus({ postId: post.id, status: 'published' }).updates(
							postQuery,
							postsQuery
						);
						await gotoPost();
					}
				}
			];
		}

		return [
			{
				id: 'save',
				label: 'Save changes',
				class: 'btn-primary',
				run: async (payload) => {
					await update(payload);
					await gotoPost();
				}
			}
		];
	}
</script>

<Seo title="Edit {post.title} - {project.name}" noindex />

<svelte:boundary>
	<ProjectPostForm
		title={post.title}
		kind={post.kind}
		content={parsedContent}
		{actions}
		fallbackErrorMessage="Unable to save post"
	/>

	{#snippet pending()}
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
			<div class="skeleton h-8 w-56"></div>
			<div class="skeleton h-12 w-full"></div>
			<div class="skeleton h-80 w-full"></div>
		</div>
	{/snippet}
</svelte:boundary>
