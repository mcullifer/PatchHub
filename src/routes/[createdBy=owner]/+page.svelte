<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { Card, EmptyState, Icon } from '$lib/components/common-ui';
	import ProjectFormModal from '$lib/components/projects/ProjectFormModal.svelte';
	import { getOwnerProfile } from '$lib/remote/projects.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let createModal = $state<{ open: () => void } | null>(null);

	const profile = $derived(await getOwnerProfile(params.createdBy));
	const ownerName = $derived(profile.owner.name);
	const profilePictureUrl = $derived(profile.owner.profilePictureUrl);
	const projectCount = $derived(profile.projects.length);
	const avatarLetter = $derived(ownerName.charAt(0).toUpperCase());
	const ownerKindLabel = $derived(
		profile.owner.kind === 'org' ? 'Organization' : 'Personal account'
	);

	function formatMonthYear(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		});
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString();
	}
</script>

{#snippet newProjectButton()}
	<button type="button" class="btn btn-primary btn-sm" onclick={() => createModal?.open()}>
		<Icon icon="add" size="sm" />
		New project
	</button>
{/snippet}

<Seo
	title="{ownerName} - PatchHub"
	description="Projects and patch notes from {ownerName} on PatchHub."
/>

<svelte:boundary>
	<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
		<Card class="bg-base-200 card-sm">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
				<div class={['avatar', !profilePictureUrl && 'avatar-placeholder']}>
					<div class="bg-secondary text-secondary-content ring-base-300 w-20 rounded-box ring-4">
						{#if profilePictureUrl}
							<img
								src={profilePictureUrl}
								alt={`${ownerName}'s profile picture`}
								class="object-cover"
							/>
						{:else}
							<span class="text-3xl font-semibold">{avatarLetter}</span>
						{/if}
					</div>
				</div>
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="truncate text-2xl font-bold">{ownerName}</h1>
						<span class="badge badge-ghost badge-sm">{ownerKindLabel}</span>
					</div>
					<p class="text-base-content/60 mt-1 text-sm">
						<span class="inline-flex items-center gap-1.5">
							<span aria-hidden="true"><Icon icon="calendar_month" size="xs" /></span>
							Joined {formatMonthYear(profile.owner.createdAt)}
						</span>
					</p>
				</div>
			</div>
		</Card>

		<div class="flex items-center justify-between gap-3">
			<div class="flex items-baseline gap-2">
				<h2 class="text-lg font-semibold">Projects</h2>
				<span class="badge badge-ghost badge-sm" aria-label={`${projectCount} projects`}>
					{projectCount}
				</span>
			</div>
			{#if profile.isOwner}
				{@render newProjectButton()}
			{/if}
		</div>

		{#if profile.projects.length > 0}
			<ul class="list bg-base-200 rounded-box overflow-hidden">
				{#each profile.projects as project (project.id)}
					<li>
						<a
							class="list-row hover:bg-base-300 focus-visible:bg-base-300 group"
							href={resolve('/[createdBy=owner]/[project]', {
								createdBy: params.createdBy,
								project: project.slug
							})}
						>
							<div
								aria-hidden="true"
								class="bg-secondary/15 text-secondary flex size-10 shrink-0 items-center justify-center rounded-box"
							>
								<Icon icon="folder_open" size="sm" />
							</div>
							<div class="min-w-0">
								<div class="flex items-center justify-between gap-3">
									<span class="group-hover:text-primary truncate font-semibold">
										{project.name}
									</span>
									<span class="text-base-content/50 shrink-0 text-xs sm:hidden">
										{formatDate(project.updatedAt)}
									</span>
								</div>
								{#if project.description}
									<p class="text-base-content/70 mt-1 line-clamp-2 text-sm sm:line-clamp-1">
										{project.description}
									</p>
								{:else}
									<p class="text-base-content/50 mt-1 text-sm">No description</p>
								{/if}
							</div>
							<div class="hidden shrink-0 items-center gap-3 sm:flex">
								<span class="text-base-content/50 text-xs">
									Updated {formatDate(project.updatedAt)}
								</span>
								<span aria-hidden="true">
									<Icon
										icon="arrow_forward"
										size="sm"
										class="text-base-content/40 group-hover:text-primary"
									/>
								</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{:else if profile.isOwner}
			<EmptyState
				icon="rocket_launch"
				title="Create your first project"
				description="Projects hold the posts you publish for your users."
			>
				{@render newProjectButton()}
			</EmptyState>
		{:else}
			<EmptyState
				icon="folder_open"
				title="No projects yet"
				description={`${ownerName} hasn't created any projects.`}
			/>
		{/if}
	</section>

	{#snippet pending()}
		<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<div class="skeleton rounded-box size-20"></div>
				<div class="flex flex-col gap-2">
					<div class="skeleton h-6 w-40"></div>
					<div class="skeleton h-4 w-24"></div>
				</div>
			</div>
			<div class="skeleton h-64 w-full"></div>
		</section>
	{/snippet}
</svelte:boundary>

<ProjectFormModal bind:this={createModal} mode={{ kind: 'create', createdBy: params.createdBy }} />
