<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Icon } from '$lib/components/common-ui';
	import {
		createProjectPost,
		getOwnedProject,
		getProjectPosts
	} from '$lib/remote/projectPosts.remote';
	import TipTap from '$lib/components/wysiwyg/TipTap.svelte';
	import type { PageProps } from './$types';

	type ProjectPostStatus = 'draft' | 'published';
	type ProjectPostKind = 'patch_notes' | 'announcement';

	let { params }: PageProps = $props();

	const project = $derived(
		(await getOwnedProject({ createdBy: params.createdBy, projectSlug: params.project })).project
	);

	let editor = $state<TipTap | null>(null);
	let title = $state('');
	let kind = $state<ProjectPostKind>('patch_notes');
	let attemptedSubmit = $state(false);
	let contentIssue = $state<string | null>(null);
	let failureMessage = $state<string | null>(null);
	let pendingStatus = $state<ProjectPostStatus | null>(null);

	const titleIssue = $derived(
		attemptedSubmit && title.trim().length === 0 ? 'Add a title before saving.' : null
	);

	async function saveProjectPost(status: ProjectPostStatus): Promise<void> {
		if (pendingStatus) return;

		attemptedSubmit = true;
		contentIssue = null;
		failureMessage = null;

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		const payload = editor?.getPayload();
		if (!payload || payload.isEmpty) {
			contentIssue = 'Write something first';
			return;
		}

		pendingStatus = status;
		try {
			const projectPost = await createProjectPost({
				projectId: project.id,
				kind,
				title: trimmedTitle,
				content: JSON.stringify(payload.json),
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
		} catch (error) {
			failureMessage = getErrorMessage(error);
		} finally {
			pendingStatus = null;
		}
	}

	function getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unable to create post';
	}
</script>

<svelte:head>
	<title>New post - {project.name}</title>
</svelte:head>

<svelte:boundary>
	<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
		<div class="flex flex-col gap-4">
			<div class="join" role="radiogroup" aria-label="Post type">
				<input
					type="radio"
					name="post-kind"
					class="btn btn-soft"
					aria-label="Patch notes"
					value="patch_notes"
					bind:group={kind}
				/>
				<input
					type="radio"
					name="post-kind"
					class="btn btn-soft"
					aria-label="Announcement"
					value="announcement"
					bind:group={kind}
				/>
			</div>

			<div>
				<input
					type="text"
					bind:value={title}
					class={['input input-lg w-full font-semibold', titleIssue && 'input-error']}
					placeholder="Title"
					maxlength={150}
					aria-invalid={titleIssue ? 'true' : undefined}
				/>
				{#if titleIssue}
					<p class="text-error mt-2 text-sm">{titleIssue}</p>
				{/if}
			</div>

			<TipTap bind:this={editor} placeholder="Write your post…" />
		</div>

		{#if contentIssue}
			<div role="alert" class="alert alert-warning">
				<Icon icon="warning" />
				<span>{contentIssue}</span>
			</div>
		{/if}

		{#if failureMessage}
			<div role="alert" class="alert alert-error">
				<Icon icon="error" />
				<span>{failureMessage}</span>
			</div>
		{/if}

		<div class="flex flex-wrap justify-end gap-2">
			<button
				type="button"
				class="btn btn-soft"
				disabled={pendingStatus !== null}
				onclick={() => saveProjectPost('draft')}
			>
				{#if pendingStatus === 'draft'}
					<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
				{/if}
				Save draft
			</button>
			<button
				type="button"
				class="btn btn-primary"
				disabled={pendingStatus !== null}
				onclick={() => saveProjectPost('published')}
			>
				{#if pendingStatus === 'published'}
					<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
				{/if}
				Publish
			</button>
		</div>
	</div>

	{#snippet pending()}
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
			<div class="skeleton h-8 w-56"></div>
			<div class="skeleton h-12 w-full"></div>
			<div class="skeleton h-80 w-full"></div>
		</div>
	{/snippet}
</svelte:boundary>
