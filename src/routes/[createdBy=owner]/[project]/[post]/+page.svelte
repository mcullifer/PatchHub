<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { Card, Icon } from '$lib/components/common-ui';
	import TipTap, { type TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import {
		deleteProjectPost,
		getProjectPost,
		getProjectPosts,
		setProjectPostStatus
	} from '$lib/remote/projectPosts.remote';
	import { tiptapExcerpt } from '$lib/util/tiptapExcerpt';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

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
	const post = $derived(result.post);
	const parsedContent = $derived(parseTipTapContent(post.content));
	const isPublished = $derived(post.status === 'published');
	const currentUser = getCurrentUser();
	const isOwner = $derived(currentUser()?.id === project.owner.id);

	let deleteDialog = $state<HTMLDialogElement | null>(null);
	let statusPending = $state(false);
	let isDeleting = $state(false);

	function formatDate(timestamp: number | null): string {
		return new Date(timestamp ?? Date.now()).toLocaleDateString(undefined, {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function parseTipTapContent(content: string): TipTapContent | null {
		try {
			return JSON.parse(content) as TipTapContent;
		} catch {
			return null;
		}
	}

	async function toggleStatus(): Promise<void> {
		if (statusPending) return;

		statusPending = true;
		try {
			await setProjectPostStatus({
				postId: post.id,
				status: isPublished ? 'draft' : 'published'
			}).updates(postQuery, postsQuery);
		} finally {
			statusPending = false;
		}
	}

	async function confirmDelete(): Promise<void> {
		if (isDeleting) return;

		isDeleting = true;
		try {
			await deleteProjectPost({ postId: post.id }).updates(postsQuery);
			// replaceState removes the deleted post from history so back navigation skips it.
			await goto(
				resolve('/[createdBy=owner]/[project]', {
					createdBy: params.createdBy,
					project: project.slug
				}),
				{ replaceState: true }
			);
		} finally {
			isDeleting = false;
		}
	}
</script>

<Seo
	title="{post.title} - {project.name}"
	description={tiptapExcerpt(post.content) ||
		`${post.title} — an update for ${project.name} on PatchHub.`}
	image={project.banner.status === 'ready' ? project.banner.url : undefined}
	type="article"
/>

<svelte:boundary>
	<article class="mx-auto w-full max-w-4xl">
		<Card class="bg-base-200 card-sm md:card-md">
			<header class="flex flex-col gap-3">
				<h1 class="text-2xl font-bold sm:text-3xl">{post.title}</h1>
				<div class="flex flex-wrap items-center gap-2">
					<span class="badge badge-soft badge-info badge-sm">
						{post.kind === 'announcement' ? 'Announcement' : 'Patch notes'}
					</span>
					{#if post.status === 'draft'}
						<span class="badge badge-soft badge-warning badge-sm">Draft</span>
					{/if}
					<span class="text-base-content/60 inline-flex items-center gap-1.5 text-sm">
						<span aria-hidden="true"><Icon icon="calendar_month" size="xs" /></span>
						{formatDate(post.publishedAt ?? post.createdAt)}
					</span>
				</div>
			</header>

			{#if isOwner}
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<a
						class="btn btn-soft btn-sm"
						href={resolve('/[createdBy=owner]/[project]/[post]/edit', {
							createdBy: params.createdBy,
							project: project.slug,
							post: post.slug
						})}
					>
						<Icon icon="edit_square" size="sm" />
						Edit
					</a>
					<button
						type="button"
						class="btn btn-soft btn-sm"
						disabled={statusPending}
						onclick={toggleStatus}
					>
						{#if statusPending}
							<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
						{/if}
						{isPublished ? 'Unpublish' : 'Publish'}
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-sm text-error"
						onclick={() => deleteDialog?.showModal()}
					>
						<Icon icon="delete" size="sm" />
						Delete
					</button>
				</div>
			{/if}

			<div class="divider"></div>

			{#if parsedContent}
				<TipTap content={parsedContent} editable={false} />
			{:else}
				<p class="text-base-content/60 text-sm italic">This post can't be displayed.</p>
			{/if}
		</Card>
	</article>

	{#snippet pending()}
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
			<div class="skeleton h-9 w-2/3"></div>
			<div class="flex gap-2">
				<div class="skeleton h-5 w-20"></div>
				<div class="skeleton h-5 w-24"></div>
			</div>
			<div class="skeleton h-96 w-full"></div>
		</div>
	{/snippet}
</svelte:boundary>

<dialog
	bind:this={deleteDialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (isDeleting) event.preventDefault();
	}}
>
	<div class="modal-box">
		<h2 class="text-lg font-semibold">Delete post</h2>
		<p class="text-base-content/60 mt-1 text-sm">This permanently removes the post.</p>
		<div class="modal-action">
			<button
				type="button"
				class="btn btn-ghost"
				disabled={isDeleting}
				onclick={() => deleteDialog?.close()}
			>
				Cancel
			</button>
			<button type="button" class="btn btn-error" disabled={isDeleting} onclick={confirmDelete}>
				{#if isDeleting}
					<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
				{/if}
				Delete
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button disabled={isDeleting}>close</button>
	</form>
</dialog>
