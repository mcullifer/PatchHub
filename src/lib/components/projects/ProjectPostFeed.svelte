<script lang="ts">
	import { resolve } from '$app/paths';
	import { EmptyState, Icon } from '$lib/components/common-ui';
	import {
		UpdateFeedArticle,
		UpdateFeedPostList,
		type UpdateFeedBadge,
		type UpdateFeedPostListItem
	} from '$lib/components/update-feed';
	import TipTap, { type TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';
	import { getProjectPost, type getProjectPosts } from '$lib/remote/projectPosts.remote';
	import { tick } from 'svelte';

	type ProjectPostsResult = Awaited<ReturnType<typeof getProjectPosts>>;
	type Project = ProjectPostsResult['project'];
	type ProjectPost = ProjectPostsResult['posts'][number];

	let {
		project,
		posts,
		createdBy
	}: {
		project: Project;
		posts: ProjectPost[];
		createdBy: string;
	} = $props();

	let selectedPostSlug = $state<string | null>(null);

	const selectedPostSummary = $derived(
		posts.find((post) => post.slug === selectedPostSlug) ?? posts[0] ?? null
	);
	const postNavItems = $derived(
		posts.map((post): UpdateFeedPostListItem => ({
			id: post.slug,
			title: post.status === 'draft' ? `Draft — ${post.title}` : post.title,
			dateLabel: getPostDate(post),
			isSelected: selectedPostSummary?.slug === post.slug,
			badgeLabel: kindLabel(post.kind)
		}))
	);
	const articleSectionId = 'project-post';

	function formatDate(timestamp: number | null): string {
		return new Date(timestamp ?? Date.now()).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getPostDate(post: { publishedAt: number | null; createdAt: number }): string {
		return formatDate(post.publishedAt ?? post.createdAt);
	}

	function kindLabel(kind: ProjectPost['kind']): string {
		return kind === 'announcement' ? 'Announcement' : 'Patch notes';
	}

	function getArticleBadges(post: {
		kind: ProjectPost['kind'];
		status: 'draft' | 'published' | 'archived';
	}): UpdateFeedBadge[] {
		const badges: UpdateFeedBadge[] = [{ label: kindLabel(post.kind) }];
		if (post.status !== 'published') {
			badges.push({ label: post.status === 'draft' ? 'Draft' : 'Archived', tone: 'warning' });
		}
		return badges;
	}

	function parseTipTapContent(content: string): TipTapContent | null {
		try {
			return JSON.parse(content) as TipTapContent;
		} catch {
			return null;
		}
	}

	async function selectPost(slug: string): Promise<void> {
		selectedPostSlug = slug;
		await tick();

		const articleSection = document.getElementById(articleSectionId);
		if (articleSection && articleSection.getBoundingClientRect().top < 96) {
			articleSection.scrollIntoView({ block: 'start' });
		}
	}
</script>

{#snippet newPostButton()}
	<a
		class="btn btn-primary btn-sm"
		href={resolve('/[createdBy=owner]/[project]/new', {
			createdBy,
			project: project.slug
		})}
	>
		<Icon icon="edit_square" size="sm" />
		New post
	</a>
{/snippet}

{#if project.isOwner}
	<div class="flex justify-end">
		{@render newPostButton()}
	</div>
{/if}

{#if posts.length > 0}
	<div class="grid min-h-0 gap-3 sm:gap-4 lg:grid-cols-4">
		<UpdateFeedPostList
			title="Posts"
			ariaLabel={`${project.name} posts`}
			items={postNavItems}
			emptyMessage="No posts yet."
			onselect={selectPost}
		/>

		<section id={articleSectionId} class="min-w-0 scroll-mt-24 lg:col-span-3">
			<svelte:boundary>
				{#if selectedPostSummary}
					{@const selectedResult = await getProjectPost({
						createdBy,
						projectSlug: project.slug,
						postSlug: selectedPostSummary.slug
					})}
					{@const selectedPost = selectedResult.post}
					{@const parsedContent = parseTipTapContent(selectedPost.content)}
					<UpdateFeedArticle
						title={selectedPost.title}
						sourceLabel="PatchHub"
						badges={getArticleBadges(selectedPost)}
						meta={[{ value: getPostDate(selectedPost) }]}
					>
						{#if parsedContent}
							<TipTap content={parsedContent} editable={false} />
						{:else}
							<p class="text-base-content/60 text-sm italic">This post can't be displayed.</p>
						{/if}
						<div class="flex justify-end">
							<a
								class="btn btn-ghost btn-sm"
								href={resolve('/[createdBy=owner]/[project]/[post]', {
									createdBy,
									project: project.slug,
									post: selectedPost.slug
								})}
							>
								Open post
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
		title="Write your first post"
		description="Publish posts so your users know what changed."
	>
		{@render newPostButton()}
	</EmptyState>
{:else}
	<EmptyState icon="notes" title="No posts yet" />
{/if}
