<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { createSoftwareSource, getSoftwareSourceSummaries } from '$lib/remote/software.remote';
	import {
		IMAGE_UPLOAD_ACCEPT,
		IMAGE_UPLOAD_MAX_SIZE_LABEL,
		getImageUploadValidationError
	} from '$convex/lib/imageUpload';

	type SoftwareSourceImport = {
		name: string;
		feedUrl: string;
		imageUrl: string;
	};

	let {
		summariesQuery
	}: {
		summariesQuery: ReturnType<typeof getSoftwareSourceSummaries>;
	} = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	let nameInput = $state<HTMLInputElement | null>(null);
	let feedUrlInput = $state<HTMLInputElement | null>(null);
	let imageInput = $state<HTMLInputElement | null>(null);
	let imageUrlInput = $state<HTMLInputElement | null>(null);
	let sourceJson = $state('');
	let sourceJsonIssue = $state<string | null>(null);
	let imageFileIssue = $state<string | null>(null);
	let saveError = $state<string | null>(null);

	const sourceJsonPlaceholder =
		'{"name":"Google Chrome","feedUrl":"https://example.com/releases.xml","imageUrl":"https://example.com/product-image.png"}';
	const saving = $derived(createSoftwareSource.pending > 0);
	const enhance = createSoftwareSource.enhance(async (form) => {
		saveError = null;
		const image = imageInput?.files?.[0] ?? null;
		imageFileIssue = image ? await getImageUploadValidationError(image, 'Card image') : null;
		if (imageFileIssue) return;

		try {
			const succeeded = await form.submit().updates();
			if (!succeeded) return;

			form.element.reset();
			sourceJson = '';
			sourceJsonIssue = null;
			imageFileIssue = null;
			dialog?.close();
			await summariesQuery.refresh();
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Unable to add software source';
		}
	});

	export function open(): void {
		saveError = null;
		imageFileIssue = null;
		dialog?.showModal();
	}

	async function validateImageFile(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const image = input.files?.[0] ?? null;
		const issue = image ? await getImageUploadValidationError(image, 'Card image') : null;
		if (input.files?.[0] === image) imageFileIssue = issue;
	}

	function importSourceJson(event: Event): void {
		sourceJsonIssue = null;
		const json = (event.currentTarget as HTMLTextAreaElement).value;
		if (!json.trim()) return;

		try {
			const source = JSON.parse(json) as unknown;
			if (!isSoftwareSourceImport(source)) throw new Error();

			if (nameInput) nameInput.value = source.name;
			if (feedUrlInput) feedUrlInput.value = source.feedUrl;
			if (imageUrlInput) imageUrlInput.value = source.imageUrl;
			if (imageInput) imageInput.value = '';
			imageFileIssue = null;
		} catch {
			sourceJsonIssue = 'Paste JSON with name, feedUrl, and imageUrl values.';
		}
	}

	function isSoftwareSourceImport(value: unknown): value is SoftwareSourceImport {
		if (typeof value !== 'object' || value === null) return false;
		const source = value as Record<string, unknown>;

		return (
			typeof source.name === 'string' &&
			typeof source.feedUrl === 'string' &&
			typeof source.imageUrl === 'string'
		);
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
			<fieldset class="fieldset">
				<label class="label" for="software-source-json">Paste source JSON</label>
				<textarea
					id="software-source-json"
					class="textarea min-h-24 w-full font-mono text-xs"
					bind:value={sourceJson}
					oninput={importSourceJson}
					placeholder={sourceJsonPlaceholder}></textarea>
				<p class="label">Fills the name, feed URL, and card image URL below.</p>
				{#if sourceJsonIssue}
					<p class="text-error text-sm">{sourceJsonIssue}</p>
				{/if}

				<label class="label" for="software-source-name">Name</label>
				<input
					bind:this={nameInput}
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
					bind:this={feedUrlInput}
					{...createSoftwareSource.fields.feedUrl.as('url')}
					id="software-source-feed-url"
					class="input w-full"
					required
					placeholder="https://example.com/releases.xml"
				/>

				<label class="label" for="software-source-image-file">Card image file</label>
				<input
					bind:this={imageInput}
					{...createSoftwareSource.fields.imageFile.as('file')}
					id="software-source-image-file"
					class="file-input w-full"
					accept={IMAGE_UPLOAD_ACCEPT}
					onchange={validateImageFile}
				/>
				<p class="label">
					Drag and drop or choose an image up to {IMAGE_UPLOAD_MAX_SIZE_LABEL}.
				</p>
				{#each createSoftwareSource.fields.imageFile.issues() ?? [] as issue (issue.message)}
					<p class="text-error text-sm">{issue.message}</p>
				{/each}
				{#if imageFileIssue}
					<p class="text-error text-sm">{imageFileIssue}</p>
				{/if}

				<label class="label" for="software-source-image-url">Or card image URL</label>
				<input
					bind:this={imageUrlInput}
					{...createSoftwareSource.fields.imageUrl.as('url')}
					id="software-source-image-url"
					class="input w-full"
					placeholder="https://example.com/product-image.png"
				/>
				{#each createSoftwareSource.fields.imageUrl.issues() ?? [] as issue (issue.message)}
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
