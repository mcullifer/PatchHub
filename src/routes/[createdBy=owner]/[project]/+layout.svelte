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

<svelte:boundary>
	{@const createdBy = page.params.createdBy ?? ''}
	{@const projectSlug = page.params.project ?? ''}
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

	{#snippet pending()}
		<section
			class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-2 py-4 sm:gap-4 sm:px-4 sm:py-6 lg:px-6"
		>
			<div class="skeleton h-5 w-56"></div>
			<div class="skeleton h-40 w-full sm:h-48"></div>
			<div class="grid gap-3 sm:gap-4 lg:grid-cols-4">
				<div class="skeleton hidden h-64 lg:block"></div>
				<div class="skeleton h-96 lg:col-span-3"></div>
			</div>
		</section>
	{/snippet}
</svelte:boundary>
