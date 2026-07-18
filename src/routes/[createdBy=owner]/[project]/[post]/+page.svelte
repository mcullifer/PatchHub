<script lang="ts">
	import { Card, Icon } from '$lib/components/common-ui';
	import TipTap, { type TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';
	import { getProjectPost } from '$lib/remote/projectPosts.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const result = $derived(
		await getProjectPost({
			createdBy: params.createdBy,
			projectSlug: params.project,
			postSlug: params.post
		})
	);
	const project = $derived(result.project);
	const post = $derived(result.post);
	const parsedContent = $derived(parseTipTapContent(post.content));

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
</script>

<svelte:head>
	<title>{post.title} - {project.name}</title>
</svelte:head>

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
