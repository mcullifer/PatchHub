<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		getOwnedProject,
		getProjectPost,
		getProjectPosts
	} from '$lib/remote/projectPosts.remote';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const createdBy = $derived(page.params.createdBy ?? '');
	const projectSlug = $derived(page.params.project ?? '');
</script>

{#snippet projectFrame(
	createdBy: string,
	projectName: string,
	projectSlug: string,
	currentLabel: string | null
)}
	<section
		class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-2 py-4 sm:gap-4 sm:px-4 sm:py-6 lg:px-6"
	>
		<div class="breadcrumbs text-sm">
			<ul>
				<li>
					<a href={resolve('/[createdBy=owner]', { createdBy })}>{createdBy}</a>
				</li>
				{#if currentLabel}
					<li>
						<a
							href={resolve('/[createdBy=owner]/[project]', {
								createdBy,
								project: projectSlug
							})}
						>
							{projectName}
						</a>
					</li>
					<li>
						<span class="block max-w-48 truncate sm:max-w-xs">{currentLabel}</span>
					</li>
				{:else}
					<li>{projectName}</li>
				{/if}
			</ul>
		</div>

		{@render children()}
	</section>
{/snippet}

{#if page.route.id === '/[createdBy=owner]/[project]/[post]' && page.params.post}
	{@const result = await getProjectPost({
		createdBy,
		projectSlug,
		postSlug: page.params.post
	})}
	{@render projectFrame(createdBy, result.project.name, result.project.slug, result.post.title)}
{:else if page.route.id === '/[createdBy=owner]/[project]/new'}
	{@const result = await getOwnedProject({ createdBy, projectSlug })}
	{@render projectFrame(createdBy, result.project.name, result.project.slug, 'New post')}
{:else}
	{@const result = await getProjectPosts({ createdBy, projectSlug })}
	{@render projectFrame(createdBy, result.project.name, result.project.slug, null)}
{/if}
