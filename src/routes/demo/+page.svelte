<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TipTap, {
		type TipTapJsonContent,
		type TipTapSavePayload
	} from '$lib/components/wysiwyg/TipTap.svelte';

	const seedContent: TipTapJsonContent = {
		type: 'doc',
		content: [
			{
				type: 'heading',
				attrs: { level: 1 },
				content: [{ type: 'text', text: 'Patch 1.42 — Midsummer Update' }]
			},
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'This patch focuses on ' },
					{ type: 'text', marks: [{ type: 'bold' }], text: 'performance' },
					{ type: 'text', text: ' and ' },
					{ type: 'text', marks: [{ type: 'italic' }], text: 'quality of life' },
					{ type: 'text', text: '. Full details on the ' },
					{
						type: 'text',
						marks: [{ type: 'link', attrs: { href: 'https://example.com/roadmap' } }],
						text: 'public roadmap'
					},
					{ type: 'text', text: '.' }
				]
			},
			{
				type: 'heading',
				attrs: { level: 2 },
				content: [{ type: 'text', text: 'New features' }]
			},
			{
				type: 'bulletList',
				content: [
					{
						type: 'listItem',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'Workshop mod loader with dependency resolution' }]
							},
							{
								type: 'bulletList',
								content: [
									{
										type: 'listItem',
										content: [
											{
												type: 'paragraph',
												content: [{ type: 'text', text: 'Nested: automatic load-order sorting' }]
											}
										]
									}
								]
							}
						]
					},
					{
						type: 'listItem',
						content: [
							{
								type: 'paragraph',
								content: [
									{ type: 'text', text: 'New photo mode, toggle with ' },
									{ type: 'text', marks: [{ type: 'code' }], text: 'F8' }
								]
							}
						]
					}
				]
			},
			{
				type: 'heading',
				attrs: { level: 2 },
				content: [{ type: 'text', text: 'Balance changes' }]
			},
			{
				type: 'orderedList',
				attrs: { start: 1 },
				content: [
					{
						type: 'listItem',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'Plasma rifle damage reduced 12%' }]
							}
						]
					},
					{
						type: 'listItem',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'Shield regen delay increased to 4s' }]
							}
						]
					}
				]
			},
			{
				type: 'blockquote',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Community note: thanks for the 4,000+ reports during the beta — keep them coming.'
							}
						]
					}
				]
			},
			{
				type: 'codeBlock',
				attrs: { language: null },
				content: [
					{
						type: 'text',
						text: '// New console command\npatchhub.reload --workshop --verbose'
					}
				]
			},
			{
				type: 'image',
				attrs: {
					src: 'https://picsum.photos/seed/patchhub/960/420',
					alt: 'Midsummer update key art',
					title: null
				}
			},
			{ type: 'horizontalRule' },
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'See you on the servers — ' },
					{ type: 'text', marks: [{ type: 'italic' }], text: 'The PatchHub team' }
				]
			}
		]
	};

	const emptyContent: TipTapJsonContent = {
		type: 'doc',
		content: [{ type: 'paragraph' }]
	};

	let editorEditable = $state(true);
	let sideBySide = $state(true);
	let emptyDoc = $state(false);
	let editorContent = $derived(emptyDoc ? emptyContent : seedContent);
	// Simulate persistence: stringify then parse, like a round trip through the backend.
	let publishedContent = $state<TipTapJsonContent>(
		JSON.parse(JSON.stringify(seedContent)) as TipTapJsonContent
	);
	let lastSavedAt = $state<Date | null>(null);

	function handleSave(payload: TipTapSavePayload): void {
		publishedContent = JSON.parse(JSON.stringify(payload.json)) as TipTapJsonContent;
		lastSavedAt = new Date();
	}
</script>

<Seo title="Editor playground | PatchHub" noindex />

<div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
	<div class="flex flex-wrap items-center gap-4">
		<h1 class="text-xl font-semibold">Editor playground</h1>
		<div class="ml-auto flex flex-wrap items-center gap-4">
			<label class="label cursor-pointer gap-2 text-sm">
				<input type="checkbox" class="toggle toggle-sm" bind:checked={editorEditable} />
				Editable
			</label>
			<label class="label cursor-pointer gap-2 text-sm">
				<input type="checkbox" class="toggle toggle-sm" bind:checked={sideBySide} />
				Side by side
			</label>
			<label class="label cursor-pointer gap-2 text-sm">
				<input type="checkbox" class="toggle toggle-sm" bind:checked={emptyDoc} />
				Empty doc
			</label>
		</div>
	</div>

	<div class={['flex flex-col gap-6', sideBySide && 'xl:flex-row']}>
		<section class={['flex min-w-0 flex-col gap-2', sideBySide && 'xl:flex-1']}>
			<h2 class="text-sm font-medium text-base-content/60">
				Editor {editorEditable ? '' : '(read-only)'}
			</h2>
			<TipTap content={editorContent} editable={editorEditable} onsave={handleSave} />
		</section>

		<section class={['flex min-w-0 flex-col gap-2', sideBySide && 'xl:flex-1']}>
			<h2 class="text-sm font-medium text-base-content/60">
				Published view
				{#if lastSavedAt}
					<span class="text-base-content/40">
						— updated {lastSavedAt.toLocaleTimeString()}
					</span>
				{:else}
					<span class="text-base-content/40">— save in the editor to update</span>
				{/if}
			</h2>
			<TipTap content={publishedContent} editable={false} />
		</section>
	</div>
</div>
