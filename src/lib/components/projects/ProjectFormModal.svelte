<script module lang="ts">
	import { getProjectPosts } from '$lib/remote/projectPosts.remote';

	export type ProjectFormModalProject = Awaited<ReturnType<typeof getProjectPosts>>['project'];

	export type ProjectFormModalMode =
		| { kind: 'create'; createdBy: string }
		| { kind: 'edit'; project: ProjectFormModalProject; createdBy: string; projectSlug: string };
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Icon } from '$lib/components/common-ui';
	import {
		PROJECT_BANNER_ACCEPT,
		PROJECT_BANNER_MAX_SIZE_LABEL,
		getProjectBannerValidationError
	} from '$lib/projects/projectBanner';
	import {
		getRememberedProjectBannerFile,
		runProjectBannerUpload
	} from '$lib/projects/projectBannerUpload';
	import {
		beginProjectBannerUpload,
		createProject,
		getOwnerProfile,
		updateProject
	} from '$lib/remote/projects.remote';

	let { mode }: { mode: ProjectFormModalMode } = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	const heading = $derived(mode.kind === 'create' ? 'New project' : 'Edit project');
	const subtitle = $derived(
		mode.kind === 'create' ? 'Create a home for your posts.' : 'Update your project details.'
	);

	// ----- Create -----
	let selectedBanner = $state<File | null>(null);
	let createBannerIssue = $state<string | null>(null);
	let isCreatingProject = $state(false);
	const isSubmittingProject = $derived(createProject.pending > 0 || isCreatingProject);

	function selectBanner(event: Event): void {
		selectedBanner = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		createBannerIssue = null;
	}

	const createEnhance = createProject.enhance(async (form) => {
		if (mode.kind !== 'create') return;
		const { createdBy } = mode;
		const banner = selectedBanner;
		createBannerIssue = banner ? await getProjectBannerValidationError(banner) : null;
		if (createBannerIssue) return;

		isCreatingProject = true;
		try {
			const succeeded = await form.submit().updates(getOwnerProfile(createdBy));
			const result = form.result;
			if (!succeeded || !result) return;

			const destination = {
				createdBy: result.createdBy,
				projectSlug: result.slug
			};
			let uploadTask: ReturnType<typeof runProjectBannerUpload> | null = null;
			if (banner && result.bannerUpload) {
				uploadTask = runProjectBannerUpload({
					projectQuery: getProjectPosts(destination),
					projectId: result.id,
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
	});

	// ----- Edit -----
	let projectName = $state('');
	let projectDescription = $state('');
	let projectNameIssue = $state<string | null>(null);
	let projectSaveError = $state<string | null>(null);
	let isSavingProject = $state(false);

	async function saveProject(): Promise<void> {
		if (mode.kind !== 'edit' || isSavingProject) return;

		projectNameIssue = null;
		projectSaveError = null;

		const trimmedName = projectName.trim();
		if (!trimmedName) {
			projectNameIssue = 'Project name is required';
			return;
		}

		isSavingProject = true;
		try {
			await updateProject({
				projectId: mode.project.id,
				name: trimmedName,
				description: projectDescription.trim() || undefined
			}).updates(
				getProjectPosts({ createdBy: mode.createdBy, projectSlug: mode.projectSlug }),
				getOwnerProfile(mode.createdBy)
			);
			dialog?.close();
		} catch (error) {
			projectSaveError = error instanceof Error ? error.message : 'Unable to save project';
		} finally {
			isSavingProject = false;
		}
	}

	// Edit banner upload state machine (relocated from ProjectHero).
	let bannerInput = $state<HTMLInputElement | null>(null);
	let editBannerIssue = $state<string | null>(null);
	let isUploadingBanner = $state(false);

	const editProject = $derived(mode.kind === 'edit' ? mode.project : null);
	const bannerUrl = $derived(editProject?.banner.url ?? null);
	const isBannerPending = $derived(editProject?.banner.status === 'pending');
	const isBannerBusy = $derived(isUploadingBanner || isBannerPending);
	const bannerActionLabel = $derived.by(() => {
		if (isBannerPending) return 'Uploading banner';
		if (editProject?.banner.status === 'failed') return 'Retry banner upload';
		return bannerUrl ? 'Change banner' : 'Upload banner';
	});

	async function updateBanner(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (mode.kind !== 'edit') return;

		const { id: projectId } = mode.project;
		const projectQuery = getProjectPosts({
			createdBy: mode.createdBy,
			projectSlug: mode.projectSlug
		});
		const file = bannerInput?.files?.[0] ?? getRememberedProjectBannerFile(projectId) ?? null;
		editBannerIssue = file
			? await getProjectBannerValidationError(file)
			: 'Choose an image to upload';
		if (!file || editBannerIssue) return;

		isUploadingBanner = true;
		try {
			const attempt = await beginProjectBannerUpload({ projectId }).updates(projectQuery);
			const result = await runProjectBannerUpload({
				projectQuery,
				projectId,
				file,
				attemptId: attempt.attemptId,
				uploadUrl: attempt.uploadUrl
			});

			if (result === 'ready') {
				bannerInput?.form?.reset();
			} else if (result === 'stale') {
				editBannerIssue = 'The banner upload was replaced by a newer attempt';
			} else if (result === 'unreported_failure') {
				editBannerIssue = 'Unable to upload the project banner';
			}
		} catch {
			editBannerIssue = 'Unable to start the project banner upload';
		} finally {
			isUploadingBanner = false;
		}
	}

	const busy = $derived(mode.kind === 'create' ? isSubmittingProject : isSavingProject);

	export function open(): void {
		if (mode.kind === 'edit') {
			projectName = mode.project.name;
			projectDescription = mode.project.description ?? '';
			projectNameIssue = null;
			projectSaveError = null;
			editBannerIssue = null;
		}
		dialog?.showModal();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (busy) event.preventDefault();
	}}
>
	<div class="modal-box">
		<h2 class="text-lg font-semibold">{heading}</h2>
		<p class="text-base-content/60 mt-1 text-sm">{subtitle}</p>

		{#if mode.kind === 'create'}
			<form {...createEnhance} class="mt-4 flex flex-col gap-4">
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
					{#if createBannerIssue}
						<p class="text-error text-sm">{createBannerIssue}</p>
					{/if}
				</fieldset>

				<div class="modal-action">
					<button
						type="button"
						class="btn btn-ghost"
						disabled={isSubmittingProject}
						onclick={() => dialog?.close()}
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
		{:else}
			<div class="mt-4 flex flex-col gap-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Name</legend>
					<input
						type="text"
						bind:value={projectName}
						class={['input w-full', projectNameIssue && 'input-error']}
						required
						maxlength={100}
						autocomplete="off"
						placeholder="Project name"
					/>
					{#if projectNameIssue}
						<p class="text-error text-sm">{projectNameIssue}</p>
					{/if}
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Description</legend>
					<textarea
						bind:value={projectDescription}
						class="textarea w-full"
						maxlength={500}
						rows="4"
						placeholder="What is this project about?"></textarea>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Banner image</legend>
					<form onsubmit={updateBanner} class="flex flex-col gap-2">
						{#if mode.project.banner.status === 'failed'}
							<div role="alert" class="alert alert-error alert-soft py-2 text-sm">
								<Icon icon="error" size="sm" />
								<span>{mode.project.banner.message}</span>
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
								onchange={() => (editBannerIssue = null)}
							/>
							<button type="submit" class="btn btn-soft btn-sm" disabled={isBannerBusy}>
								{#if isBannerBusy}
									<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
								{/if}
								{bannerActionLabel}
							</button>
						</div>
						<p class="label">
							JPEG, PNG, WebP, GIF, or AVIF up to {PROJECT_BANNER_MAX_SIZE_LABEL}.
						</p>
						{#if editBannerIssue}
							<p class="text-error text-sm">{editBannerIssue}</p>
						{/if}
					</form>
				</fieldset>

				{#if projectSaveError}
					<div role="alert" class="alert alert-error">
						<Icon icon="error" />
						<span>{projectSaveError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						type="button"
						class="btn btn-ghost"
						disabled={isSavingProject}
						onclick={() => dialog?.close()}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn btn-primary"
						disabled={isSavingProject}
						onclick={saveProject}
					>
						{#if isSavingProject}
							<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
						{/if}
						Save changes
					</button>
				</div>
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button disabled={busy}>close</button>
	</form>
</dialog>
