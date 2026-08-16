<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		PROJECT_DESCRIPTION_MAX_LENGTH,
		PROJECT_NAME_MAX_LENGTH
	} from '$convex/lib/contentLimits';
	import {
		IMAGE_UPLOAD_ACCEPT,
		IMAGE_UPLOAD_FORMATS_LABEL,
		IMAGE_UPLOAD_MAX_SIZE_LABEL,
		getImageUploadValidationError
	} from '$lib/images/imageValidation';
	import { uploadImageToStorage } from '$lib/images/imageUpload';
	import { createProject, generateProjectBannerUploadUrl } from '$lib/remote/projects.remote';
	import { tick } from 'svelte';

	let dialog = $state<HTMLDialogElement | null>(null);
	let bannerIssue = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let isUploading = $state(false);

	const isSubmitting = $derived(createProject.pending > 0 || isUploading);
	const projectForm = createProject.enhance(async (form) => {
		saveError = null;
		const banner = form.fields.bannerFile.value();
		bannerIssue = banner ? getImageUploadValidationError(banner, 'Banner image') : null;
		if (bannerIssue) return;

		try {
			if (banner) {
				isUploading = true;
				const uploadUrl = await generateProjectBannerUploadUrl();
				const storageId = await uploadImageToStorage(fetch, uploadUrl, banner);
				form.fields.set({
					bannerFile: undefined,
					bannerStorageId: storageId,
					bannerContentType: banner.type
				});
				await tick();
			}
			if (!(await form.submit())) return;

			const project = form.result;
			if (!project) return;

			await goto(
				resolve('/[createdBy=owner]/[project]', {
					createdBy: project.createdBy,
					project: project.slug
				})
			);
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to create project';
		} finally {
			isUploading = false;
		}
	});

	function validateBanner(): void {
		const banner = createProject.fields.bannerFile.value();
		bannerIssue = banner ? getImageUploadValidationError(banner, 'Banner image') : null;
		createProject.fields.set({
			bannerStorageId: undefined,
			bannerContentType: undefined
		});
	}

	export function open(): void {
		saveError = null;
		bannerIssue = null;
		dialog?.showModal();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (isSubmitting) event.preventDefault();
	}}
>
	<div class="modal-box">
		<h2 class="text-lg font-semibold">New project</h2>
		<p class="text-base-content/60 mt-1 text-sm">Create a home for your posts.</p>

		<form {...projectForm} class="mt-4 flex flex-col gap-4" enctype="multipart/form-data">
			<input {...createProject.fields.bannerStorageId.as('hidden', '')} />
			<input {...createProject.fields.bannerContentType.as('hidden', '')} />
			<fieldset class="fieldset">
				<label class="label" for="create-project-name">Name</label>
				<input
					{...createProject.fields.name.as('text')}
					id="create-project-name"
					class="input w-full"
					required
					maxlength={PROJECT_NAME_MAX_LENGTH}
					autocomplete="off"
					placeholder="Project name"
				/>
				{#each createProject.fields.name.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="create-project-description">Description</label>
				<textarea
					{...createProject.fields.description.as('text')}
					id="create-project-description"
					class="textarea w-full"
					maxlength={PROJECT_DESCRIPTION_MAX_LENGTH}
					rows="4"
					placeholder="What is this project about?"></textarea>
				{#each createProject.fields.description.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="create-project-banner">Banner image</label>
				<input
					{...createProject.fields.bannerFile.as('file')}
					id="create-project-banner"
					class="file-input w-full"
					accept={IMAGE_UPLOAD_ACCEPT}
					onchange={validateBanner}
				/>
				<p class="label">
					Optional. {IMAGE_UPLOAD_FORMATS_LABEL} up to {IMAGE_UPLOAD_MAX_SIZE_LABEL}.
				</p>
				{#each createProject.fields.bannerFile.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
				{#if bannerIssue}
					<p class="text-error text-sm">{bannerIssue}</p>
				{/if}
			</fieldset>

			{#if saveError}
				<p role="alert" class="text-error text-sm">{saveError}</p>
			{/if}

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={isSubmitting}
					onclick={() => dialog?.close()}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
					{/if}
					Create
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button disabled={isSubmitting}>close</button>
	</form>
</dialog>
