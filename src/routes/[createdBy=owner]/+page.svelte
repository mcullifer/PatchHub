<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { EmptyState, Icon } from '$lib/components/common-ui';
	import HeroDots from '$lib/components/layout/HeroDots.svelte';
	import CreateProjectModal from '$lib/components/projects/CreateProjectModal.svelte';
	import ProjectCard from '$lib/components/projects/ProjectCard.svelte';
	import { getCurrentUser } from '$lib/contexts/currentUser';
	import { getOwnerProfile } from '$lib/remote/projects.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let createModal = $state<{ open: () => void } | null>(null);

	const profile = $derived(await getOwnerProfile(params.createdBy));
	const ownerName = $derived(profile.owner.name);
	const profilePictureUrl = $derived(profile.owner.profilePictureUrl);
	const currentUser = getCurrentUser();
	const isOwner = $derived(currentUser()?.id === profile.owner.id);
	const projectCount = $derived(profile.projects.length);
	const avatarLetter = $derived(ownerName.charAt(0).toUpperCase());
	const ownerKindLabel = $derived(profile.owner.kind === 'org' ? 'Organization' : 'Personal');

	function formatMonthYear(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		});
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
	<div class="bg-base-200 border-base-300 relative overflow-hidden border-b">
		<div
			class="relative mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-8 sm:gap-5 sm:px-6 sm:py-10 lg:px-8"
		>
			<HeroDots class="h-36" />

			<div class={['avatar shrink-0', !profilePictureUrl && 'avatar-placeholder']}>
				<div
					class="bg-secondary text-secondary-content ring-base-300 rounded-box w-16 ring-2 sm:w-24 sm:ring-4"
				>
					{#if profilePictureUrl}
						<img
							src={profilePictureUrl}
							alt={`${ownerName}'s profile picture`}
							class="object-cover"
						/>
					{:else}
						<span class="text-2xl font-semibold sm:text-4xl">{avatarLetter}</span>
					{/if}
				</div>
			</div>

			<div class="flex min-w-0 flex-col gap-1.5 sm:gap-2">
				<h1 class="truncate text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
					{ownerName}
				</h1>
				<div
					class="text-base-content/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:gap-x-4 sm:text-sm"
				>
					<span class="badge badge-soft badge-secondary badge-sm">{ownerKindLabel}</span>
					<span class="inline-flex items-center gap-1.5">
						<Icon icon="folder_open" size="xs" />
						{projectCount}
						{projectCount === 1 ? 'project' : 'projects'}
					</span>
					<span class="inline-flex items-center gap-1.5">
						<Icon icon="calendar_month" size="xs" />
						Joined {formatMonthYear(profile.owner.createdAt)}
					</span>
				</div>
			</div>
		</div>
	</div>

	<section class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h2 class="text-base-content/50 text-xs font-semibold tracking-widest uppercase">Projects</h2>
			{#if isOwner}
				{@render newProjectButton()}
			{/if}
		</div>

		{#if profile.projects.length > 0}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each profile.projects as project (project.id)}
					<li>
						<ProjectCard {project} createdBy={params.createdBy} />
					</li>
				{/each}
			</ul>
		{:else if isOwner}
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
		<div class="bg-base-200 border-base-300 border-b">
			<div
				class="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-8 sm:gap-5 sm:px-6 sm:py-10 lg:px-8"
			>
				<div class="skeleton rounded-box size-16 shrink-0 sm:size-24"></div>
				<div class="flex flex-col gap-1.5 sm:gap-2">
					<div class="skeleton h-8 w-40 sm:h-10 sm:w-56"></div>
					<div class="flex flex-wrap gap-2">
						<div class="skeleton h-5 w-20"></div>
						<div class="skeleton h-5 w-24"></div>
						<div class="skeleton h-5 w-32"></div>
					</div>
				</div>
			</div>
		</div>
		<section class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="skeleton mb-4 h-4 w-24"></div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each { length: 3 }}
					<div class="skeleton aspect-[1200/630]"></div>
				{/each}
			</div>
		</section>
	{/snippet}
</svelte:boundary>

{#if isOwner}
	<CreateProjectModal bind:this={createModal} />
{/if}
