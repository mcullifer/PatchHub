<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { UpdateFeedHero } from '$lib/components/update-feed';
	import {
		PROJECT_BANNER_ACCEPT,
		PROJECT_BANNER_MAX_SIZE_LABEL
	} from '$lib/projects/projectBanner';
	import type { getProjectNotes } from '$lib/remote/patchNotes.remote';
	import { updateProjectBanner } from '$lib/remote/projects.remote';

	type Project = Awaited<ReturnType<typeof getProjectNotes>>['project'];

	let { project }: { project: Project } = $props();

	const projectBannerForm = $derived(updateProjectBanner.for(project.id));
	const isUpdatingBanner = $derived(projectBannerForm.pending > 0);
	const description = $derived(
		project.description ?? `Patch notes and updates from ${project.ownerName}.`
	);
</script>

{#snippet bannerActions()}
	<form
		{...projectBannerForm.enhance(async (form) => {
			const updated = await form.submit();
			if (updated) form.element.reset();
		})}
		enctype="multipart/form-data"
		class="flex flex-col items-start gap-2"
	>
		<input {...projectBannerForm.fields.projectId.as('hidden', project.id)} />
		<div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
			<input
				{...projectBannerForm.fields.banner.as('file')}
				class="file-input file-input-sm w-full"
				accept={PROJECT_BANNER_ACCEPT}
				aria-label="Project banner image"
				required
			/>
			<button type="submit" class="btn btn-soft btn-sm" disabled={isUpdatingBanner}>
				{#if isUpdatingBanner}
					<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
				{/if}
				{project.bannerUrl ? 'Change banner' : 'Upload banner'}
			</button>
		</div>
		<p class="text-base-content/60 text-xs">
			JPEG, PNG, WebP, GIF, or AVIF up to {PROJECT_BANNER_MAX_SIZE_LABEL}.
		</p>
		{#each projectBannerForm.fields.banner.issues() ?? [] as issue (issue.message)}
			<p class="text-error text-sm">{issue.message}</p>
		{/each}
		{#if projectBannerForm.result?.updated}
			<p class="text-success text-sm" role="status">Banner updated.</p>
		{/if}
	</form>
{/snippet}

<UpdateFeedHero
	title={project.name}
	{description}
	imageUrl={project.bannerUrl}
	imageAlt={project.bannerUrl ? `${project.name} banner` : ''}
	actions={project.isOwner ? bannerActions : undefined}
>
	{#snippet fallbackIcon()}
		<Icon icon="image" size="xl" class="text-base-content/30" />
	{/snippet}
</UpdateFeedHero>
