<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Attachment } from 'svelte/attachments';
	import { imageProtocols, normalizeUrl } from './TipTapTypes';

	type Props = {
		editor: Editor;
	};

	let { editor }: Props = $props();

	let dialog: HTMLDialogElement | null = null;
	let urlInput: HTMLInputElement | null = null;
	let imageUrl = $state('');
	let altText = $state('');

	const titleId = $props.id();
	const urlPattern = '^(https?://.+|//.+|/[^/].+|[^\\s]+\\.[^\\s]+.*)$';
	const urlPatternRegex = new RegExp(urlPattern);
	const normalizedSrc = $derived(
		normalizeUrl(imageUrl, {
			allowRootRelative: true,
			allowedProtocols: imageProtocols
		})
	);
	const canInsert = $derived(normalizedSrc !== '' && urlPatternRegex.test(imageUrl.trim()));

	const captureDialog: Attachment<HTMLDialogElement> = (node) => {
		dialog = node;

		return () => {
			if (dialog === node) dialog = null;
		};
	};

	const captureUrlInput: Attachment<HTMLInputElement> = (node) => {
		urlInput = node;

		return () => {
			if (urlInput === node) urlInput = null;
		};
	};

	export function open(): void {
		imageUrl = '';
		altText = '';
		dialog?.showModal();
		queueMicrotask(() => urlInput?.focus());
	}

	function close(): void {
		dialog?.close();
	}

	function insertImage(): void {
		if (!canInsert) return;

		const alt = altText.trim();
		editor
			.chain()
			.focus()
			.setImage({
				src: normalizedSrc,
				...(alt ? { alt } : {})
			})
			.run();
		close();
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		insertImage();
	}
</script>

<dialog
	{@attach captureDialog}
	class="modal modal-bottom sm:modal-middle"
	aria-labelledby={titleId}
>
	<form class="modal-box max-w-md" onsubmit={handleSubmit}>
		<h3 id={titleId} class="text-base font-semibold">Insert image</h3>

		<fieldset class="fieldset mt-2">
			<legend class="fieldset-legend">URL</legend>
			<input
				{@attach captureUrlInput}
				bind:value={imageUrl}
				type="text"
				inputmode="url"
				class="input input-sm validator w-full"
				pattern={urlPattern}
				placeholder="https://example.com/image.png"
				required
			/>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alt text</legend>
			<input
				bind:value={altText}
				type="text"
				class="input input-sm w-full"
				placeholder="Optional"
			/>
		</fieldset>

		<div class="modal-action">
			<button type="button" class="btn btn-soft btn-sm" onclick={close}>Cancel</button>
			<button type="submit" class="btn btn-primary btn-sm" disabled={!canInsert}>Insert</button>
		</div>
	</form>

	<form method="dialog" class="modal-backdrop">
		<button>Close</button>
	</form>
</dialog>
