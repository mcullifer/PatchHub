<script lang="ts">
	import { resolve } from '$app/paths';
	import { EmptyState, Icon } from '$lib/components/common-ui';
	import {
		UpdateFeedArticle,
		UpdateFeedPostList,
		type UpdateFeedMetaItem,
		type UpdateFeedPostListItem
	} from '$lib/components/update-feed';
	import TipTap, { type TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';
	import { getPatchNote, type getProjectNotes } from '$lib/remote/patchNotes.remote';
	import { tick } from 'svelte';

	type ProjectNotesResult = Awaited<ReturnType<typeof getProjectNotes>>;
	type Project = ProjectNotesResult['project'];
	type ProjectNote = ProjectNotesResult['notes'][number];

	let {
		project,
		notes,
		createdBy
	}: {
		project: Project;
		notes: ProjectNote[];
		createdBy: string;
	} = $props();

	let selectedNoteSlug = $state<string | null>(null);

	const selectedNoteSummary = $derived(
		notes.find((note) => note.slug === selectedNoteSlug) ?? notes[0] ?? null
	);
	const noteNavItems = $derived(
		notes.map((note): UpdateFeedPostListItem => ({
			id: note.slug,
			title: note.status === 'draft' ? `Draft — ${note.title}` : note.title,
			dateLabel: getNoteDate(note),
			isSelected: selectedNoteSummary?.slug === note.slug
		}))
	);
	const articleSectionId = 'project-patch-note';

	function formatDate(timestamp: number | null): string {
		return new Date(timestamp ?? Date.now()).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getNoteDate(note: { publishedAt: number | null; createdAt: number }): string {
		return formatDate(note.publishedAt ?? note.createdAt);
	}

	function getArticleMeta(note: {
		status: 'draft' | 'published' | 'archived';
		publishedAt: number | null;
		createdAt: number;
	}): UpdateFeedMetaItem[] {
		const date = {
			label: note.status === 'published' ? 'Published' : 'Created',
			value: getNoteDate(note)
		};
		if (note.status === 'published') return [date];

		return [date, { label: 'Status', value: note.status === 'draft' ? 'Draft' : 'Archived' }];
	}

	function parseTipTapContent(content: string): TipTapContent | null {
		try {
			return JSON.parse(content) as TipTapContent;
		} catch {
			return null;
		}
	}

	async function selectNote(slug: string): Promise<void> {
		selectedNoteSlug = slug;
		await tick();

		const articleSection = document.getElementById(articleSectionId);
		if (articleSection && articleSection.getBoundingClientRect().top < 96) {
			articleSection.scrollIntoView({ block: 'start' });
		}
	}
</script>

{#snippet newPatchNoteButton()}
	<a
		class="btn btn-primary btn-sm"
		href={resolve('/[createdBy=owner]/[project]/new', {
			createdBy,
			project: project.slug
		})}
	>
		<Icon icon="edit_square" size="sm" />
		New patch note
	</a>
{/snippet}

{#if project.isOwner}
	<div class="flex justify-end">
		{@render newPatchNoteButton()}
	</div>
{/if}

{#if notes.length > 0}
	<div class="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-4">
		<UpdateFeedPostList
			title="Patch notes"
			ariaLabel={`${project.name} patch notes`}
			items={noteNavItems}
			emptyMessage="No patch notes yet."
			onselect={selectNote}
		/>

		<section id={articleSectionId} class="min-w-0 scroll-mt-24 lg:col-span-3">
			<svelte:boundary>
				{#if selectedNoteSummary}
					{@const selectedResult = await getPatchNote({
						createdBy,
						projectSlug: project.slug,
						noteSlug: selectedNoteSummary.slug
					})}
					{@const selectedNote = selectedResult.note}
					{@const parsedContent = parseTipTapContent(selectedNote.content)}
					<UpdateFeedArticle
						title={selectedNote.title}
						sourceLabel="PatchHub"
						meta={getArticleMeta(selectedNote)}
					>
						{#if parsedContent}
							<TipTap content={parsedContent} editable={false} />
						{:else}
							<p class="text-base-content/60 text-sm italic">This patch note can't be displayed.</p>
						{/if}
						<div class="flex justify-end">
							<a
								class="btn btn-ghost btn-sm"
								href={resolve('/[createdBy=owner]/[project]/[note]', {
									createdBy,
									project: project.slug,
									note: selectedNote.slug
								})}
							>
								Open note
								<Icon icon="arrow_forward" size="sm" />
							</a>
						</div>
					</UpdateFeedArticle>
				{/if}

				{#snippet pending()}
					<div class="card card-sm md:card-md bg-base-200">
						<div class="card-body">
							<div class="skeleton min-h-96 w-full"></div>
						</div>
					</div>
				{/snippet}
			</svelte:boundary>
		</section>
	</div>
{:else if project.isOwner}
	<EmptyState
		icon="history_edu"
		title="Write your first patch note"
		description="Publish updates so your users know what changed."
	>
		{@render newPatchNoteButton()}
	</EmptyState>
{:else}
	<EmptyState icon="notes" title="No patch notes yet" />
{/if}
