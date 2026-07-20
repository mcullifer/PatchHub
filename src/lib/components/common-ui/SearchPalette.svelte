<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Icon } from '$lib/components/common-ui';
	import type { ISteamApp } from '$lib/models/Steam';
	import { searchGames } from '$lib/remote/games.remote';
	import { hasKeyboard, modifierKey } from '$lib/util/keyboard';
	import { getSteamGamePath } from '$lib/util/SteamRoute';
	import { useDebounce } from 'runed';
	import { onDestroy } from 'svelte';
	import { on } from 'svelte/events';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let query = $state('');
	let results = $state<ISteamApp[]>([]);
	let selectedIndex = $state<number | undefined>();
	let loading = $state(false);
	let inputElement: HTMLInputElement | undefined;
	let searchRequestId = 0;
	let destroyed = false;

	const paletteId = $props.id();
	const listboxId = `${paletteId}-listbox`;
	const optionId = (index: number) => `${paletteId}-option-${index}`;
	const activeOptionId = $derived(
		selectedIndex !== undefined && results[selectedIndex] !== undefined
			? optionId(selectedIndex)
			: undefined
	);
	const isAboveThreshold = $derived(query.length >= 3);

	const debouncedSearch = useDebounce(async (q: string, requestId: number) => {
		await performSearch(q, requestId);
	}, 200);

	function clearResults() {
		results = [];
		selectedIndex = undefined;
	}

	function cancelPendingSearch() {
		searchRequestId += 1;
		debouncedSearch.cancel();
	}

	async function performSearch(q: string, requestId: number) {
		if (destroyed) return;

		if (q.length < 3) {
			if (requestId === searchRequestId) clearResults();
			loading = false;
			return;
		}

		loading = true;
		try {
			const found = await searchGames(q);
			if (destroyed || requestId !== searchRequestId) return;

			results = found;
			selectedIndex = found.length > 0 ? 0 : undefined;
		} catch {
			console.error('Failed to retrieve search results');
		} finally {
			if (!destroyed && requestId === searchRequestId) loading = false;
		}
	}

	function scheduleSearch() {
		if (destroyed) return;

		const q = query;
		const requestId = ++searchRequestId;

		clearResults();
		if (q.length < 3) {
			debouncedSearch.cancel();
			loading = false;
			return;
		}

		loading = true;
		debouncedSearch(q, requestId).catch((error: unknown) => {
			if (error !== 'Cancelled') throw error;
		});
	}

	function submitResult(result: ISteamApp) {
		open = false;
		goto(resolve(getSteamGamePath(result) as `/${string}/${string}/${string}`));
	}

	function requestClose() {
		open = false;
	}

	// Clean slate so a reopen never shows stale results or a stale query.
	// Runs on the dialog's close event, after the exit transition, so the
	// content doesn't empty out mid-fade.
	function onDialogClose() {
		open = false;
		cancelPendingSearch();
		query = '';
		clearResults();
		loading = false;
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) requestClose();
	}

	onDestroy(() => {
		destroyed = true;
		cancelPendingSearch();
	});

	function attachInput(node: HTMLInputElement) {
		inputElement = node;
		return () => {
			if (inputElement === node) inputElement = undefined;
		};
	}

	function fitVisualViewport(node: HTMLDialogElement) {
		const viewport = window.visualViewport;
		if (!viewport) return;

		const updateHeight = () => {
			node.style.setProperty('--search-palette-height', `${viewport.height * 0.7}px`);
		};

		updateHeight();
		return on(viewport, 'resize', updateHeight);
	}

	let closing = false;

	// Drive the native dialog from `open`, and focus the input the moment it
	// shows — the dialog spec sends showModal() focus to the [autofocus] input;
	// the explicit call is belt-and-braces. Entrances/exits transition through
	// the .modal-opening/.modal-closing styles in app.css.
	function syncOpen(node: HTMLDialogElement) {
		if (open) {
			if (!node.open && !closing) {
				// Commit the closed visual state before removing the entrance class.
				node.classList.add('modal-opening');
				node.showModal();
				node.getBoundingClientRect();
				node.classList.remove('modal-opening');
			}
			inputElement?.focus();
		} else if (node.open && !closing) {
			closing = true;
			node.classList.add('modal-closing');
			const transitions = node.getAnimations({ subtree: true });
			Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => {
				closing = false;
				node.classList.remove('modal-closing');
				if (open) {
					inputElement?.focus();
					return;
				}
				node.close();
			});
		}
	}

	function scrollActiveResultIntoView() {
		if (selectedIndex === undefined) return;
		document.getElementById(optionId(selectedIndex))?.scrollIntoView({ block: 'nearest' });
	}

	function moveSelectedIndex(direction: 1 | -1) {
		if (results.length === 0) return;

		if (selectedIndex === undefined) {
			selectedIndex = direction === 1 ? 0 : results.length - 1;
			scrollActiveResultIntoView();
			return;
		}

		selectedIndex = (selectedIndex + direction + results.length) % results.length;
		scrollActiveResultIntoView();
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				moveSelectedIndex(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				moveSelectedIndex(-1);
				break;
			case 'Tab':
				// Make Tab behave like ArrowDown, Shift+Tab like ArrowUp.
				event.preventDefault();
				moveSelectedIndex(event.shiftKey ? -1 : 1);
				break;
			case 'Home':
				if (results.length === 0) return;
				event.preventDefault();
				selectedIndex = 0;
				scrollActiveResultIntoView();
				break;
			case 'End':
				if (results.length === 0) return;
				event.preventDefault();
				selectedIndex = results.length - 1;
				scrollActiveResultIntoView();
				break;
			case 'Enter':
				if (selectedIndex !== undefined && results[selectedIndex] !== undefined) {
					event.preventDefault();
					submitResult(results[selectedIndex]);
				}
				break;
			case 'Escape':
				// Native dialog cancel also closes; handle explicitly so Escape
				// works even when the browser skips the close request.
				event.preventDefault();
				requestClose();
				break;
		}
	}
</script>

<dialog
	class="modal items-start pt-[12vh]"
	{@attach syncOpen}
	{@attach fitVisualViewport}
	onclose={onDialogClose}
	oncancel={(event) => {
		event.preventDefault();
		requestClose();
	}}
	onclick={onBackdropClick}
>
	<div
		class="modal-box flex h-[min(26rem,var(--search-palette-height,70dvh))] max-w-xl flex-col overflow-hidden p-0"
	>
		<div class="border-base-content/10 flex items-center gap-3 border-b px-4">
			<Icon icon="search" size="sm" class="text-base-content/50 select-none" />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				{@attach attachInput}
				autofocus
				bind:value={query}
				oninput={scheduleSearch}
				onkeydown={handleKeydown}
				type="text"
				placeholder="Search games…"
				class="grow bg-transparent py-4 text-base outline-none"
				role="combobox"
				aria-autocomplete="list"
				aria-controls={listboxId}
				aria-expanded="true"
				aria-activedescendant={activeOptionId}
			/>
			{#if hasKeyboard.current}
				<kbd class="kbd kbd-sm">esc</kbd>
			{/if}
		</div>

		<ul
			class="menu menu-xl sm:menu-md w-full grow flex-nowrap overflow-y-auto"
			id={listboxId}
			role="listbox"
		>
			{#if !isAboveThreshold}
				<li role="presentation">
					<span class="text-base-content/50">Search for a game</span>
				</li>
			{:else if results.length === 0 && loading}
				<li role="presentation">
					<span class="text-base-content/50">Searching…</span>
				</li>
			{:else}
				{#each results as result, i (result.appid)}
					<li role="none">
						<button
							id={optionId(i)}
							role="option"
							tabindex="-1"
							aria-selected={selectedIndex === i}
							class={selectedIndex === i ? 'menu-active' : ''}
							type="button"
							onclick={() => submitResult(result)}
							onmouseenter={() => (selectedIndex = i)}
						>
							{result.name}
						</button>
					</li>
				{:else}
					<li role="presentation">
						<span class="text-base-content/50">No results found</span>
					</li>
				{/each}
			{/if}
		</ul>

		{#if hasKeyboard.current}
			<div
				class="border-base-content/10 text-base-content/50 flex items-center justify-between border-t px-4 py-2 text-xs"
			>
				<span class="flex items-center gap-2">
					<span class="flex items-center gap-1">
						<kbd class="kbd kbd-xs">↑</kbd><kbd class="kbd kbd-xs">↓</kbd>
						Navigate
					</span>
					<span class="flex items-center gap-1">
						<kbd class="kbd kbd-xs">↵</kbd>
						Select
					</span>
				</span>
				<span class="flex items-center gap-1">
					<kbd class="kbd kbd-xs">{modifierKey}</kbd><kbd class="kbd kbd-xs">K</kbd>
				</span>
			</div>
		{/if}
	</div>
</dialog>
