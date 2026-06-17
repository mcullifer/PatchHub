<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import { Tooltip } from '$lib/components/common-ui/floating';
	import type {
		BlockFormat,
		NormalizeUrlOptions,
		TextAlignment,
		TipTapToolbarProps,
		ToolbarButton
	} from './TipTapTypes';

	let { editor, revision, onsave }: TipTapToolbarProps = $props();

	const linkProtocols = ['http:', 'https:', 'mailto:'] as const;
	const imageProtocols = ['http:', 'https:'] as const;
	const componentId = $props.id();
	const blockFormatId = `${componentId}-block-format`;
	const blockFormats: { value: BlockFormat; label: string; title: string }[] = [
		{ value: 'paragraph', label: 'P', title: 'Paragraph' },
		{ value: 'heading-1', label: 'H1', title: 'Heading 1' },
		{ value: 'heading-2', label: 'H2', title: 'Heading 2' },
		{ value: 'heading-3', label: 'H3', title: 'Heading 3' },
		{ value: 'codeBlock', label: '<>', title: 'Code block' }
	];

	let saveStatus = $state<'idle' | 'saving'>('idle');
	let toolbarState = $derived.by(() => ({
		revision,
		blockFormat: getActiveBlockFormat(),
		can: {
			undo: editor.can().undo(),
			redo: editor.can().redo()
		},
		active: {
			bold: editor.isActive('bold'),
			italic: editor.isActive('italic'),
			underline: editor.isActive('underline'),
			strike: editor.isActive('strike'),
			code: editor.isActive('code'),
			bulletList: editor.isActive('bulletList'),
			orderedList: editor.isActive('orderedList'),
			blockquote: editor.isActive('blockquote'),
			link: editor.isActive('link'),
			alignLeft: editor.isActive({ textAlign: 'left' }),
			alignCenter: editor.isActive({ textAlign: 'center' }),
			alignRight: editor.isActive({ textAlign: 'right' }),
			alignJustify: editor.isActive({ textAlign: 'justify' })
		}
	}));

	const historyButtons: ToolbarButton[] = [
		{
			id: 'undo',
			label: 'Undo',
			icon: 'undo',
			run: () => {
				editor.chain().focus().undo().run();
			}
		},
		{
			id: 'redo',
			label: 'Redo',
			icon: 'redo',
			run: () => {
				editor.chain().focus().redo().run();
			}
		}
	];
	const textStyleButtons: ToolbarButton[] = [
		{
			id: 'bold',
			label: 'Bold',
			icon: 'format_bold',
			run: () => {
				editor.chain().focus().toggleBold().run();
			},
			activeKey: 'bold'
		},
		{
			id: 'italic',
			label: 'Italic',
			icon: 'format_italic',
			run: () => {
				editor.chain().focus().toggleItalic().run();
			},
			activeKey: 'italic'
		},
		{
			id: 'underline',
			label: 'Underline',
			icon: 'format_underlined',
			run: () => {
				editor.chain().focus().toggleUnderline().run();
			},
			activeKey: 'underline'
		},
		{
			id: 'strike',
			label: 'Strikethrough',
			icon: 'strikethrough_s',
			run: () => {
				editor.chain().focus().toggleStrike().run();
			},
			activeKey: 'strike'
		},
		{
			id: 'inline-code',
			label: 'Inline code',
			icon: 'code',
			run: () => {
				editor.chain().focus().toggleCode().run();
			},
			activeKey: 'code'
		}
	];
	const structureButtons: ToolbarButton[] = [
		{
			id: 'bullet-list',
			label: 'Bullet list',
			icon: 'format_list_bulleted',
			run: () => {
				editor.chain().focus().toggleBulletList().run();
			},
			activeKey: 'bulletList'
		},
		{
			id: 'ordered-list',
			label: 'Numbered list',
			icon: 'format_list_numbered',
			run: () => {
				editor.chain().focus().toggleOrderedList().run();
			},
			activeKey: 'orderedList'
		},
		{
			id: 'blockquote',
			label: 'Blockquote',
			icon: 'format_quote',
			run: () => {
				editor.chain().focus().toggleBlockquote().run();
			},
			activeKey: 'blockquote'
		},
		{
			id: 'horizontal-rule',
			label: 'Divider',
			icon: 'horizontal_rule',
			run: () => {
				editor.chain().focus().setHorizontalRule().run();
			}
		}
	];
	const alignmentButtons: ToolbarButton[] = [
		{
			id: 'align-left',
			label: 'Align left',
			icon: 'format_align_left',
			run: () => setTextAlign('left'),
			activeKey: 'alignLeft'
		},
		{
			id: 'align-center',
			label: 'Align center',
			icon: 'format_align_center',
			run: () => setTextAlign('center'),
			activeKey: 'alignCenter'
		},
		{
			id: 'align-right',
			label: 'Align right',
			icon: 'format_align_right',
			run: () => setTextAlign('right'),
			activeKey: 'alignRight'
		},
		{
			id: 'align-justify',
			label: 'Justify',
			icon: 'format_align_justify',
			run: () => setTextAlign('justify'),
			activeKey: 'alignJustify'
		}
	];
	const insertButtons: ToolbarButton[] = [
		{
			id: 'link',
			label: 'Link',
			icon: 'link',
			run: setLink,
			activeKey: 'link'
		},
		{
			id: 'image',
			label: 'Image',
			icon: 'image',
			run: insertImage
		}
	];
	const clearFormattingButton: ToolbarButton = {
		id: 'clear-formatting',
		label: 'Clear formatting',
		icon: 'format_clear',
		run: resetFormatting
	};

	function getActiveBlockFormat(): BlockFormat {
		if (editor.isActive('heading', { level: 1 })) return 'heading-1';
		if (editor.isActive('heading', { level: 2 })) return 'heading-2';
		if (editor.isActive('heading', { level: 3 })) return 'heading-3';
		if (editor.isActive('codeBlock')) return 'codeBlock';

		return 'paragraph';
	}

	function setBlockFormat(format: BlockFormat): void {
		const chain = editor.chain().focus();

		switch (format) {
			case 'paragraph':
				chain.setParagraph().run();
				return;
			case 'heading-1':
				chain.toggleHeading({ level: 1 }).run();
				return;
			case 'heading-2':
				chain.toggleHeading({ level: 2 }).run();
				return;
			case 'heading-3':
				chain.toggleHeading({ level: 3 }).run();
				return;
			case 'codeBlock':
				chain.toggleCodeBlock().run();
				return;
		}
	}

	function handleBlockFormatChange(event: Event): void {
		const selectedFormat = (event.currentTarget as HTMLSelectElement).value;

		if (!isBlockFormat(selectedFormat)) return;

		setBlockFormat(selectedFormat);
	}

	function isBlockFormat(value: string): value is BlockFormat {
		return blockFormats.some((format) => format.value === value);
	}

	function setTextAlign(alignment: TextAlignment): void {
		editor.chain().focus().setTextAlign(alignment).run();
	}

	function setLink(): void {
		const previousHref = editor.getAttributes('link').href;
		const nextHref = window.prompt(
			'Link URL',
			typeof previousHref === 'string' ? previousHref : ''
		);

		if (nextHref === null) return;

		const href = normalizeUrl(nextHref, {
			allowHash: true,
			allowRootRelative: true,
			allowedProtocols: linkProtocols
		});
		if (!href) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
	}

	function insertImage(): void {
		const src = window.prompt('Image URL');
		if (src === null) return;

		const normalizedSrc = normalizeUrl(src, {
			allowRootRelative: true,
			allowedProtocols: imageProtocols
		});
		if (!normalizedSrc) return;

		editor.chain().focus().setImage({ src: normalizedSrc }).run();
	}

	function normalizeUrl(value: string, options: NormalizeUrlOptions): string {
		const trimmedValue = value.trim();
		if (!trimmedValue) return '';

		if (options.allowHash && trimmedValue.startsWith('#')) return trimmedValue;
		if (
			options.allowRootRelative &&
			trimmedValue.startsWith('/') &&
			!trimmedValue.startsWith('//')
		) {
			return trimmedValue;
		}

		const hasProtocol = /^[a-z][a-z\d+\-.]*:/i.test(trimmedValue);
		let candidate = trimmedValue;

		if (!hasProtocol) {
			candidate = trimmedValue.startsWith('//')
				? `https:${trimmedValue}`
				: `https://${trimmedValue}`;
		}

		if (!hasAllowedProtocol(candidate, options.allowedProtocols)) return '';

		return candidate;
	}

	function hasAllowedProtocol(value: string, allowedProtocols: readonly string[]): boolean {
		try {
			const url = new URL(value);
			return allowedProtocols.includes(url.protocol);
		} catch {
			return false;
		}
	}

	function resetFormatting(): void {
		editor.chain().focus().unsetAllMarks().clearNodes().run();
	}

	function isToolbarButtonDisabled(button: ToolbarButton): boolean {
		if (button.id === 'undo') return !toolbarState.can.undo;
		if (button.id === 'redo') return !toolbarState.can.redo;

		return false;
	}

	function isToolbarButtonActive(button: ToolbarButton): boolean {
		return button.activeKey ? toolbarState.active[button.activeKey] : false;
	}

	async function saveContent(): Promise<void> {
		if (!onsave || saveStatus === 'saving') return;

		saveStatus = 'saving';

		try {
			await onsave({
				json: editor.getJSON(),
				html: editor.getHTML(),
				text: editor.getText(),
				isEmpty: editor.isEmpty
			});
		} finally {
			saveStatus = 'idle';
		}
	}
</script>

{#snippet toolbarButton(button: ToolbarButton)}
	<Tooltip>
		{#snippet reference(floating)}
			<button
				{...floating.reference({
					class: [
						'btn btn-square join-item btn-sm',
						{
							'btn-primary text-primary-content': isToolbarButtonActive(button),
							'btn-soft': !isToolbarButtonActive(button)
						}
					]
				})}
				type="button"
				title={button.label}
				aria-label={button.label}
				aria-pressed={button.activeKey ? isToolbarButtonActive(button) : undefined}
				disabled={isToolbarButtonDisabled(button)}
				onclick={button.run}
			>
				<Icon icon={button.icon} size="sm" />
			</button>
		{/snippet}
		<div class="bg-neutral text-neutral-content rounded-lg p-2 text-sm font-normal">
			{button.label}
		</div>
	</Tooltip>
{/snippet}

{#snippet toolbarButtonGroup(buttons: ToolbarButton[], label: string)}
	<div class="join" role="group" aria-label={label}>
		{#each buttons as button (button.id)}
			{@render toolbarButton(button)}
		{/each}
	</div>
{/snippet}

<div class="flex p-2 flex-wrap items-center gap-2">
	<select
		id={blockFormatId}
		class="select select-sm w-fit"
		value={toolbarState.blockFormat}
		title="Block style"
		aria-label="Block style"
		onchange={handleBlockFormatChange}
	>
		{#each blockFormats as format (format.value)}
			<option value={format.value} title={format.title}>{format.label}</option>
		{/each}
	</select>
	{@render toolbarButtonGroup(historyButtons, 'History')}
	{@render toolbarButtonGroup(textStyleButtons, 'Text style')}
	{@render toolbarButtonGroup(structureButtons, 'Structure')}
	{@render toolbarButtonGroup(alignmentButtons, 'Alignment')}
	{@render toolbarButtonGroup(insertButtons, 'Insert')}
	<div class="join" role="group" aria-label="Clear formatting">
		{@render toolbarButton(clearFormattingButton)}
	</div>

	{#if onsave}
		<div class="join ml-auto" role="group" aria-label="Save">
			<button
				type="button"
				class="btn btn-soft btn-neutral btn-square join-item btn-sm"
				title="Save editor content"
				aria-label="Save editor content"
				disabled={saveStatus === 'saving'}
				onclick={saveContent}
			>
				{#if saveStatus === 'saving'}
					<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
				{:else}
					<Icon icon="save" size="sm" />
				{/if}
			</button>
		</div>
	{/if}
</div>
