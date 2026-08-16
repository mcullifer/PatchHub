<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import {
		IMAGE_UPLOAD_ACCEPT,
		IMAGE_UPLOAD_FORMATS_LABEL,
		IMAGE_UPLOAD_MAX_SIZE_LABEL,
		getImageUploadValidationError
	} from '$lib/images/imageValidation';
	import { uploadImageToStorage } from '$lib/images/imageUpload';
	import {
		createSoftwareSource,
		generateSoftwareBannerUploadUrl
	} from '$lib/remote/software.remote';
	import { tick } from 'svelte';
	import * as v from 'valibot';

	const softwareSourceImportSchema = v.object({
		name: v.string(),
		feedUrl: v.string(),
		imageUrl: v.string()
	});

	let dialog = $state<HTMLDialogElement | null>(null);
	let sourceJson = $state('');
	let sourceJsonIssue = $state<string | null>(null);
	let bannerIssue = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let isUploading = $state(false);

	const sourceJsonPlaceholder =
		'{"name":"Google Chrome","feedUrl":"https://example.com/releases.xml","imageUrl":"https://example.com/product-image.png"}';
	const saving = $derived(createSoftwareSource.pending > 0 || isUploading);
	const enhance = createSoftwareSource.enhance(async (form) => {
		saveError = null;
		const banner = form.fields.bannerFile.value();
		const bannerUrl = form.fields.bannerUrl.value();
		bannerIssue = banner ? getImageUploadValidationError(banner, 'Banner image') : null;
		if (bannerIssue) return;
		if (banner && bannerUrl) {
			bannerIssue = 'Choose a banner file or provide a banner URL, not both';
			return;
		}

		try {
			if (banner) {
				isUploading = true;
				const uploadUrl = await generateSoftwareBannerUploadUrl();
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
			sourceJson = '';
			sourceJsonIssue = null;
			bannerIssue = null;
			dialog?.close();
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to add software source';
		} finally {
			isUploading = false;
		}
	});

	export function open(): void {
		saveError = null;
		bannerIssue = null;
		dialog?.showModal();
	}

	function validateBanner(): void {
		const banner = createSoftwareSource.fields.bannerFile.value();
		bannerIssue = banner ? getImageUploadValidationError(banner, 'Banner image') : null;
		createSoftwareSource.fields.set({
			bannerStorageId: undefined,
			bannerContentType: undefined
		});
	}

	function importSourceJson(json: string): void {
		sourceJsonIssue = null;
		if (!json.trim()) return;

		try {
			const source = v.parse(softwareSourceImportSchema, JSON.parse(json));
			createSoftwareSource.fields.set({
				name: source.name,
				feedUrl: source.feedUrl,
				bannerUrl: source.imageUrl,
				bannerFile: undefined,
				bannerStorageId: undefined,
				bannerContentType: undefined
			});
			bannerIssue = null;
		} catch {
			sourceJsonIssue = 'Paste JSON with name, feedUrl, and imageUrl values.';
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="modal modal-bottom sm:modal-middle"
	oncancel={(event) => {
		if (saving) event.preventDefault();
	}}
>
	<div class="modal-box max-w-lg">
		<h2 class="text-lg font-semibold">Add software source</h2>
		<p class="text-base-content/60 mt-1 text-sm">
			Add an RSS or Atom feed to the software section.
		</p>

		<form {...enhance} class="mt-4 flex flex-col" enctype="multipart/form-data">
			<input {...createSoftwareSource.fields.bannerStorageId.as('hidden', '')} />
			<input {...createSoftwareSource.fields.bannerContentType.as('hidden', '')} />
			<fieldset class="fieldset">
				<label class="label" for="software-source-json">Paste source JSON</label>
				<textarea
					id="software-source-json"
					class="textarea min-h-24 w-full font-mono text-xs"
					bind:value={sourceJson}
					oninput={(event) => importSourceJson(event.currentTarget.value)}
					placeholder={sourceJsonPlaceholder}></textarea>
				<p class="label">Fills the name, feed URL, and banner URL below.</p>
				{#if sourceJsonIssue}
					<p class="text-error text-sm">{sourceJsonIssue}</p>
				{/if}

				<label class="label" for="software-source-name">Name</label>
				<input
					{...createSoftwareSource.fields.name.as('text')}
					id="software-source-name"
					class="input w-full"
					required
					maxlength="100"
					autocomplete="off"
					placeholder="Google Chrome"
				/>
				{#each createSoftwareSource.fields.name.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="software-source-feed-url">Feed URL</label>
				<input
					{...createSoftwareSource.fields.feedUrl.as('url')}
					id="software-source-feed-url"
					class="input w-full"
					required
					placeholder="https://example.com/releases.xml"
				/>
				{#each createSoftwareSource.fields.feedUrl.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}

				<label class="label" for="software-source-banner-file">Banner file</label>
				<input
					{...createSoftwareSource.fields.bannerFile.as('file')}
					id="software-source-banner-file"
					class="file-input w-full"
					accept={IMAGE_UPLOAD_ACCEPT}
					onchange={validateBanner}
				/>
				<p class="label">
					Drag and drop or choose a {IMAGE_UPLOAD_FORMATS_LABEL} image up to {IMAGE_UPLOAD_MAX_SIZE_LABEL}.
				</p>
				{#each createSoftwareSource.fields.bannerFile.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
				{#if bannerIssue}
					<p class="text-error text-sm">{bannerIssue}</p>
				{/if}

				<label class="label" for="software-source-banner-url">Or banner URL</label>
				<input
					{...createSoftwareSource.fields.bannerUrl.as('url')}
					id="software-source-banner-url"
					class="input w-full"
					placeholder="https://example.com/product-image.png"
				/>
				{#each createSoftwareSource.fields.bannerUrl.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
			</fieldset>

			{#if saveError}
				<div role="alert" class="alert alert-error alert-soft">
					<Icon icon="error" />
					<span>{saveError}</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={saving}
					onclick={() => dialog?.close()}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{#if saving}
						<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
					{/if}
					Add source
				</button>
			</div>
		</form>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button disabled={saving}>close</button>
	</form>
</dialog>
