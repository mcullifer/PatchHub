<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { UpdateFeedHero } from '$lib/components/update-feed';
	import {
		PROJECT_BANNER_ACCEPT,
		PROJECT_BANNER_MAX_SIZE_LABEL,
		getProjectBannerValidationError
	} from '$lib/projects/projectBanner';
	import {
		getRememberedProjectBannerFile,
		runProjectBannerUpload
	} from '$lib/projects/projectBannerUpload';
	import { getProjectNotes } from '$lib/remote/patchNotes.remote';
	import { beginProjectBannerUpload } from '$lib/remote/projects.remote';

	type Project = Awaited<ReturnType<typeof getProjectNotes>>['project'];

	let {
		project,
		createdBy,
		projectSlug
	}: { project: Project; createdBy: string; projectSlug: string } = $props();

	let bannerInput = $state<HTMLInputElement | null>(null);
	let bannerIssue = $state<string | null>(null);
	let isUploadingBanner = $state(false);

	const projectQuery = $derived(getProjectNotes({ createdBy, projectSlug }));
	const bannerUrl = $derived(project.banner.url);
	const isBannerPending = $derived(project.banner.status === 'pending');
	const isBannerBusy = $derived(isUploadingBanner || isBannerPending);
	const description = $derived(
		project.description ?? `Patch notes and updates from ${project.ownerName}.`
	);
	const bannerActionLabel = $derived.by(() => {
		if (isBannerPending) return 'Uploading banner';
		if (project.banner.status === 'failed') return 'Retry banner upload';
		return bannerUrl ? 'Change banner' : 'Upload banner';
	});

	$effect(() => {
		if (!isBannerPending) return;

		const timer = setInterval(() => {
			void projectQuery.refresh();
		}, 5000);
		return () => clearInterval(timer);
	});

	async function updateBanner(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const file = bannerInput?.files?.[0] ?? getRememberedProjectBannerFile(project.id) ?? null;
		bannerIssue = file ? await getProjectBannerValidationError(file) : 'Choose an image to upload';
		if (!file || bannerIssue) return;

		isUploadingBanner = true;
		try {
			const attempt = await beginProjectBannerUpload({ projectId: project.id }).updates(
				projectQuery
			);
			const result = await runProjectBannerUpload({
				projectQuery,
				projectId: project.id,
				file,
				attemptId: attempt.attemptId,
				uploadUrl: attempt.uploadUrl
			});

			if (result === 'ready') {
				bannerInput?.form?.reset();
			} else if (result === 'stale') {
				bannerIssue = 'The banner upload was replaced by a newer attempt';
			} else if (result === 'unreported_failure') {
				bannerIssue = 'Unable to upload the project banner';
			}
		} catch {
			bannerIssue = 'Unable to start the project banner upload';
		} finally {
			isUploadingBanner = false;
		}
	}
</script>

{#snippet bannerActions()}
	<form onsubmit={updateBanner} class="flex flex-col items-start gap-2">
		{#if project.banner.status === 'failed'}
			<div role="alert" class="alert alert-error alert-soft py-2 text-sm">
				<Icon icon="error" size="sm" />
				<span>{project.banner.message}</span>
			</div>
		{/if}
		<div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
			<input
				bind:this={bannerInput}
				type="file"
				class="file-input file-input-sm w-full"
				accept={PROJECT_BANNER_ACCEPT}
				aria-label="Project banner image"
				disabled={isBannerBusy}
				onchange={() => (bannerIssue = null)}
			/>
			<button type="submit" class="btn btn-soft btn-sm" disabled={isBannerBusy}>
				{#if isBannerBusy}
					<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
				{/if}
				{bannerActionLabel}
			</button>
		</div>
		<p class="text-base-content/60 text-xs">
			JPEG, PNG, WebP, GIF, or AVIF up to {PROJECT_BANNER_MAX_SIZE_LABEL}.
		</p>
		{#if bannerIssue}
			<p class="text-error text-sm">{bannerIssue}</p>
		{/if}
	</form>
{/snippet}

<UpdateFeedHero
	title={project.name}
	{description}
	imageUrl={bannerUrl}
	imageAlt={bannerUrl ? `${project.name} banner` : ''}
	imagePending={isBannerPending}
	actions={project.isOwner ? bannerActions : undefined}
>
	{#snippet fallbackIcon()}
		<Icon icon="image" size="xl" class="text-base-content/30" />
	{/snippet}
</UpdateFeedHero>
