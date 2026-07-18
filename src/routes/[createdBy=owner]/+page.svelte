<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, EmptyState, Icon } from '$lib/components/common-ui';
	import {
		PROJECT_BANNER_ACCEPT,
		PROJECT_BANNER_MAX_SIZE_LABEL,
		getProjectBannerValidationError
	} from '$lib/projects/projectBanner';
	import { runProjectBannerUpload } from '$lib/projects/projectBannerUpload';
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';
	import { createProject, getOwnerProfile } from '$lib/remote/projects.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let projectDialog = $state<HTMLDialogElement | null>(null);
	let selectedBanner = $state<File | null>(null);
	let bannerIssue = $state<string | null>(null);
	let isCreatingProject = $state(false);

	const profile = $derived(await getOwnerProfile(params.createdBy));
	const ownerName = $derived(profile.owner.name);
	const profilePictureUrl = $derived(profile.owner.profilePictureUrl);
	const projectCount = $derived(profile.projects.length);
	const avatarLetter = $derived(ownerName.charAt(0).toUpperCase());
	const isSubmittingProject = $derived(createProject.pending > 0 || isCreatingProject);
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

	function openProjectDialog(): void {
		projectDialog?.showModal();
	}

	function selectBanner(event: Event): void {
		selectedBanner = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		bannerIssue = null;
	}
</script>

{#snippet newProjectButton()}
	<button type="button" class="btn btn-primary btn-sm" onclick={openProjectDialog}>
		<Icon icon="add" size="sm" />
		New project
	</button>
{/snippet}

<svelte:head>
	<title>{ownerName} - PatchHub</title>
</svelte:head>

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

<dialog
	id="new-project-modal"
	bind:this={projectDialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (isSubmittingProject) event.preventDefault();
	}}
>
	<div class="modal-box">
		<h2 class="text-lg font-semibold">New project</h2>
		<p class="text-base-content/60 mt-1 text-sm">Create a home for your posts.</p>
		<form
			{...createProject.enhance(async (form) => {
				const banner = selectedBanner;
				bannerIssue = banner ? await getProjectBannerValidationError(banner) : null;
				if (bannerIssue) return;

				isCreatingProject = true;
				try {
					const succeeded = await form.submit().updates(getOwnerProfile(params.createdBy));
					const result = form.result;
					if (!succeeded || !result) return;

					const destination = {
						createdBy: result.project.createdBy,
						projectSlug: result.project.slug
					};
					let uploadTask: ReturnType<typeof runProjectBannerUpload> | null = null;
					if (banner && result.bannerUpload) {
						uploadTask = runProjectBannerUpload({
							projectQuery: getProjectPosts(destination),
							projectId: result.project.id,
							file: banner,
							attemptId: result.bannerUpload.attemptId,
							uploadUrl: result.bannerUpload.uploadUrl
						});
					}

					await goto(
						resolve('/[createdBy=owner]/[project]', {
							createdBy: destination.createdBy,
							project: destination.projectSlug
						})
					);
					if (uploadTask) {
						await uploadTask;
					}
				} finally {
					isCreatingProject = false;
				}
			})}
			class="mt-4 flex flex-col gap-4"
		>
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Name</legend>
				<input
					{...createProject.fields.name.as('text')}
					class="input w-full"
					required
					maxlength={100}
					autocomplete="off"
					placeholder="Project name"
				/>
				{#each createProject.fields.name.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Description</legend>
				<textarea
					{...createProject.fields.description.as('text')}
					class="textarea w-full"
					maxlength={500}
					rows="4"
					placeholder="What is this project about?"></textarea>
				{#each createProject.fields.description.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
			</fieldset>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Banner image</legend>
				<input
					type="file"
					class="file-input w-full"
					accept={PROJECT_BANNER_ACCEPT}
					onchange={selectBanner}
				/>
				{#if selectedBanner}
					<input {...createProject.fields.bannerRequested.as('hidden', 'yes')} />
				{/if}
				<p class="label">
					Optional. JPEG, PNG, WebP, GIF, or AVIF up to {PROJECT_BANNER_MAX_SIZE_LABEL}.
				</p>
				{#if bannerIssue}
					<p class="text-error text-sm">{bannerIssue}</p>
				{/if}
			</fieldset>

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={isSubmittingProject}
					onclick={() => projectDialog?.close()}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={isSubmittingProject}>
					{#if isSubmittingProject}
						<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
					{/if}
					Create
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button disabled={isSubmittingProject}>close</button>
	</form>
</dialog>
