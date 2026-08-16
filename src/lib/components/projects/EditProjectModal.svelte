<script lang="ts">
	import {
		PROJECT_DESCRIPTION_MAX_LENGTH,
		PROJECT_NAME_MAX_LENGTH
	} from '$convex/lib/contentLimits';
	import { Icon } from '$lib/components/common-ui';
	import {
		IMAGE_UPLOAD_ACCEPT,
		IMAGE_UPLOAD_FORMATS_LABEL,
		IMAGE_UPLOAD_MAX_SIZE_LABEL,
		getImageUploadValidationError
	} from '$lib/images/imageValidation';
	import { uploadImageToStorage } from '$lib/images/imageUpload';
	import type { ProjectDetails } from '$lib/remote/projectPosts.remote';
	import { generateProjectBannerUploadUrl, updateProject } from '$lib/remote/projects.remote';
	import { tick } from 'svelte';

	let { project }: { project: ProjectDetails } = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let saveError = $state<string | null>(null);
	let bannerIssue = $state<string | null>(null);
	let isUploading = $state(false);

	const isSaving = $derived(updateProject.pending > 0 || isUploading);
	const projectForm = updateProject.enhance(async (form) => {
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

			form.element.reset();
			dialog?.close();
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to save project';
		} finally {
			isUploading = false;
		}
	});

	function validateBanner(): void {
		const banner = updateProject.fields.bannerFile.value();
		bannerIssue = banner ? getImageUploadValidationError(banner, 'Banner image') : null;
		updateProject.fields.set({
			bannerStorageId: undefined,
			bannerContentType: undefined
		});
	}

	export function open(): void {
		updateProject.fields.set({
			projectId: project.id,
			name: project.name,
			description: project.description ?? '',
			bannerFile: undefined,
			bannerStorageId: undefined,
			bannerContentType: undefined
		});
		saveError = null;
		bannerIssue = null;
		dialog?.showModal();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (isSaving) event.preventDefault();
	}}
>
	<div class="modal-box">
		<h2 class="text-lg font-semibold">Edit project</h2>
		<p class="text-base-content/60 mt-1 text-sm">Update your project details.</p>

		<form {...projectForm} class="mt-4 flex flex-col gap-4" enctype="multipart/form-data">
			<input {...updateProject.fields.projectId.as('hidden', project.id)} />
			<input {...updateProject.fields.bannerStorageId.as('hidden', '')} />
			<input {...updateProject.fields.bannerContentType.as('hidden', '')} />

			<fieldset class="fieldset">
				<label class="label" for="edit-project-name">Name</label>
				<input
					{...updateProject.fields.name.as('text', project.name)}
					id="edit-project-name"
					class={['input w-full', updateProject.fields.name.issues()?.length && 'input-error']}
					required
					maxlength={PROJECT_NAME_MAX_LENGTH}
					autocomplete="off"
					placeholder="Project name"
				/>
				{#each updateProject.fields.name.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="edit-project-description">Description</label>
				<textarea
					{...updateProject.fields.description.as('text', project.description ?? '')}
					id="edit-project-description"
					class="textarea w-full"
					maxlength={PROJECT_DESCRIPTION_MAX_LENGTH}
					rows="4"
					placeholder="What is this project about?"></textarea>
				{#each updateProject.fields.description.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="edit-project-banner">Banner image</label>
				<input
					{...updateProject.fields.bannerFile.as('file')}
					id="edit-project-banner"
					class="file-input w-full"
					accept={IMAGE_UPLOAD_ACCEPT}
					disabled={isSaving}
					onchange={validateBanner}
				/>
				<p class="label">
					Optional. {IMAGE_UPLOAD_FORMATS_LABEL} up to {IMAGE_UPLOAD_MAX_SIZE_LABEL}.
				</p>
				{#each updateProject.fields.bannerFile.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
				{#if bannerIssue}
					<p class="text-error text-sm">{bannerIssue}</p>
				{/if}
			</fieldset>

			{#if saveError}
				<div role="alert" class="alert alert-error">
					<Icon icon="error" />
					<span>{saveError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={isSaving}
					onclick={() => dialog?.close()}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={isSaving}>
					{#if isSaving}
						<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
					{/if}
					Save changes
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button disabled={isSaving}>close</button>
	</form>
</dialog>
