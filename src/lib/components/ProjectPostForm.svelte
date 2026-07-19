<script module lang="ts">
	import type { TipTapContent } from '$lib/components/wysiwyg/TipTap.svelte';

	export type ProjectPostFormKind = 'patch_notes' | 'announcement';

	export type ProjectPostFormPayload = {
		title: string;
		kind: ProjectPostFormKind;
		content: string;
	};

	export type ProjectPostFormAction = {
		id: string;
		label: string;
		class: string;
		run: (payload: ProjectPostFormPayload) => Promise<void>;
	};

	export type ProjectPostFormContent = TipTapContent;
</script>

<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import TipTap from '$lib/components/wysiwyg/TipTap.svelte';
	import { isHttpError } from '@sveltejs/kit';
	import { untrack } from 'svelte';

	let {
		title: initialTitle = '',
		kind: initialKind = 'patch_notes',
		content,
		actions,
		fallbackErrorMessage = 'Unable to save post'
	}: {
		title?: string;
		kind?: ProjectPostFormKind;
		content?: ProjectPostFormContent;
		actions: ProjectPostFormAction[];
		fallbackErrorMessage?: string;
	} = $props();

	let editor = $state<TipTap | null>(null);
	// Seed editable fields once from props; later prop changes must not clobber edits.
	let title = $state(untrack(() => initialTitle));
	let kind = $state<ProjectPostFormKind>(untrack(() => initialKind));
	let attemptedSubmit = $state(false);
	let contentIssue = $state<string | null>(null);
	let failureMessage = $state<string | null>(null);
	let pendingActionId = $state<string | null>(null);

	const titleIssue = $derived(
		attemptedSubmit && title.trim().length === 0 ? 'Add a title before saving.' : null
	);

	async function runAction(action: ProjectPostFormAction): Promise<void> {
		if (pendingActionId) return;

		attemptedSubmit = true;
		contentIssue = null;
		failureMessage = null;

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		const payload = editor?.getPayload();
		if (!payload || payload.isEmpty) {
			contentIssue = 'Write something first';
			return;
		}

		pendingActionId = action.id;
		try {
			await action.run({
				title: trimmedTitle,
				kind,
				content: JSON.stringify(payload.json)
			});
		} catch (error) {
			failureMessage = getFailureMessage(error);
		} finally {
			pendingActionId = null;
		}
	}

	function getFailureMessage(error: unknown): string {
		if (isHttpError(error)) return error.body.message;
		if (error instanceof Error) return error.message;
		return fallbackErrorMessage;
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Post type</legend>
			<select bind:value={kind} class="select select-sm" aria-label="Post type">
				<option value="patch_notes">Patch notes</option>
				<option value="announcement">Announcement</option>
			</select>
		</fieldset>

		<div class="flex flex-wrap justify-end gap-2">
			{#each actions as action (action.id)}
				<button
					type="button"
					class={['btn', action.class]}
					disabled={pendingActionId !== null}
					onclick={() => runAction(action)}
				>
					{#if pendingActionId === action.id}
						<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
					{/if}
					{action.label}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<input
			type="text"
			bind:value={title}
			class={['input input-lg w-full font-semibold', titleIssue && 'input-error']}
			placeholder="Title"
			maxlength={150}
			aria-invalid={titleIssue ? 'true' : undefined}
		/>
		{#if titleIssue}
			<p class="text-error mt-2 text-sm">{titleIssue}</p>
		{/if}
	</div>

	<TipTap bind:this={editor} {content} placeholder="Write your post…" />

	{#if contentIssue}
		<div role="alert" class="alert alert-warning">
			<Icon icon="warning" />
			<span>{contentIssue}</span>
		</div>
	{/if}

	{#if failureMessage}
		<div role="alert" class="alert alert-error">
			<Icon icon="error" />
			<span>{failureMessage}</span>
		</div>
	{/if}
</div>
