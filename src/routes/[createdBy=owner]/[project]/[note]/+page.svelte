<script lang="ts">
	import { Card, Icon } from '$lib/components/common-ui';
	import TipTap, { type TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';
	import { getPatchNote } from '$lib/remote/patchNotes.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const result = $derived(
		await getPatchNote({
			createdBy: params.createdBy,
			projectSlug: params.project,
			noteSlug: params.note
		})
	);
	const project = $derived(result.project);
	const note = $derived(result.note);
	const parsedContent = $derived(parseTipTapContent(note.content));

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
	<title>{note.title} - {project.name}</title>
</svelte:head>

<svelte:boundary>
	<article class="mx-auto w-full max-w-4xl">
		<Card class="bg-base-200 card-sm md:card-md">
			<header class="flex flex-col gap-3">
				<h1 class="text-2xl font-bold sm:text-3xl">{note.title}</h1>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class={[
							'badge badge-soft badge-sm',
							note.status === 'draft' ? 'badge-warning' : 'badge-success'
						]}
					>
						{note.status === 'draft' ? 'Draft' : 'Published'}
					</span>
					<span class="text-base-content/60 inline-flex items-center gap-1.5 text-sm">
						<span aria-hidden="true"><Icon icon="calendar_month" size="xs" /></span>
						{formatDate(note.publishedAt ?? note.createdAt)}
					</span>
				</div>
			</header>

			<div class="divider"></div>

			{#if parsedContent}
				<TipTap content={parsedContent} editable={false} />
			{:else}
				<p class="text-base-content/60 text-sm italic">This patch note can't be displayed.</p>
			{/if}
		</Card>
	</article>

	{#snippet pending()}
		<div class="flex justify-center py-16">
			<span class="loading loading-spinner loading-lg" aria-label="Loading"></span>
		</div>
	{/snippet}
</svelte:boundary>
