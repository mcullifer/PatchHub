<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { hotkey, Hotkeys } from '$lib/actions/hotkey';
	import { Icon } from '$lib/components/common-ui';
	import Portal from '$lib/components/common-ui/Portal.svelte';
	import {
		createFloating,
		isPointerOnElementScrollbar
	} from '$lib/components/common-ui/floating/floating.svelte';
	import type { ISteamApp } from '$lib/models/Steam';
	import { searchGames } from '$lib/remote/games.remote';
	import { getSteamGamePath } from '$lib/util/SteamRoute';
	import { flip, offset, size } from '@floating-ui/dom';
	import { useDebounce } from 'runed';
	import { onDestroy } from 'svelte';

	let dropdownOpen = $state(false);
	let searchInput = $state('');
	let searchResults = $state<ISteamApp[]>([]);
	let selectedIndex = $state<number | undefined>();
	let inputElement: HTMLInputElement | undefined;
	let container: HTMLDivElement | undefined;
	let internalLoading = $state(false);
	let searchRequestId = 0;
	let keepOpenForDropdownPointerUntil = 0;
	let destroyed = false;
	const searchId = $props.id();
	const listboxId = `${searchId}-listbox`;
	const activeOptionId = $derived(
		dropdownOpen && selectedIndex !== undefined && searchResults[selectedIndex] !== undefined
			? `${searchId}-option-${selectedIndex}`
			: undefined
	);
	const isAboveThreshold = $derived(searchInput.length >= 3);
	const floating = createFloating({
		open: () => dropdownOpen,
		opts: () => ({
			placement: 'bottom-start',
			middleware: [
				offset(2),
				size({
					apply({ rects, elements }) {
						Object.assign(elements.floating.style, {
							width: `${rects.reference.width}px`
						});
					}
				}),
				flip()
			]
		}),
		defaultPlacement: 'bottom-start'
	});
	const debouncedSearch = useDebounce(async (query: string, requestId: number) => {
		await performSearch(query, requestId);
	}, 200);

	function closeSearchDropdown() {
		dropdownOpen = false;
		selectedIndex = undefined;
	}

	function openSearchDropdown() {
		dropdownOpen = true;
	}

	function clearResults() {
		searchResults = [];
		selectedIndex = undefined;
	}

	function cancelPendingSearch() {
		searchRequestId += 1;
		debouncedSearch.cancel();
	}

	async function performSearch(query: string, requestId: number) {
		if (destroyed) return;

		if (query.length < 3) {
			if (requestId === searchRequestId) {
				clearResults();
			}
			internalLoading = false;
			return;
		}

		internalLoading = true;
		try {
			const results = await searchGames(query);
			if (destroyed) return;
			if (requestId !== searchRequestId) return;

			searchResults = results;
			selectedIndex = results.length > 0 ? 0 : undefined;
		} catch {
			console.error('Failed to retrieve search results');
		} finally {
			if (!destroyed && requestId === searchRequestId) {
				internalLoading = false;
			}
		}
	}

	function scheduleSearch() {
		if (destroyed) return;

		openSearchDropdown();
		const query = searchInput;
		const requestId = ++searchRequestId;

		clearResults();
		if (query.length < 3) {
			debouncedSearch.cancel();
			internalLoading = false;
			return;
		}

		internalLoading = true;
		debouncedSearch(query, requestId).catch((error: unknown) => {
			if (error !== 'Cancelled') throw error;
		});
	}

	function submitResult(result: ISteamApp) {
		cancelPendingSearch();
		closeSearchDropdown();
		searchInput = '';
		goto(resolve(getSteamGamePath(result) as `/${string}/${string}/${string}`));
	}

	onDestroy(() => {
		destroyed = true;
		cancelPendingSearch();
	});

	function attachContainer(node: HTMLDivElement) {
		container = node;

		return () => {
			if (container === node) {
				container = undefined;
			}
		};
	}

	function attachInput(node: HTMLInputElement) {
		inputElement = node;

		return () => {
			if (inputElement === node) {
				inputElement = undefined;
			}
		};
	}

	function isDropdownPointerActive() {
		return performance.now() <= keepOpenForDropdownPointerUntil;
	}

	function onDropdownPointerDown(event: MouseEvent | PointerEvent) {
		const floatingElement = floating.elements.floating;
		if (!floatingElement) return;

		if (
			(event.target instanceof Node && floatingElement.contains(event.target)) ||
			isPointerOnElementScrollbar(floatingElement, event)
		) {
			keepOpenForDropdownPointerUntil = performance.now() + 500;
		}
	}

	function onFocusOut(event: FocusEvent) {
		if (isDropdownPointerActive()) return;

		const relatedTarget = event.relatedTarget;
		if (
			floating.contains(relatedTarget) ||
			(relatedTarget instanceof Node && container?.contains(relatedTarget))
		) {
			return;
		}

		setTimeout(() => {
			if (isDropdownPointerActive()) return;

			const activeElement = document.activeElement;
			if (
				activeElement instanceof Node &&
				(container?.contains(activeElement) || floating.contains(activeElement))
			) {
				return;
			}

			closeSearchDropdown();
		}, 50);
	}

	function scrollActiveResultIntoView() {
		if (selectedIndex === undefined) return;
		floating.elements.floating
			?.querySelector<HTMLElement>(`#${searchId}-option-${selectedIndex}`)
			?.scrollIntoView({
				block: 'nearest',
				behavior: 'smooth'
			});
	}

	function moveSelectedIndex(direction: 1 | -1) {
		if (searchResults.length === 0) return;

		if (selectedIndex === undefined) {
			selectedIndex = direction === 1 ? 0 : searchResults.length - 1;
			scrollActiveResultIntoView();
			return;
		}

		selectedIndex = (selectedIndex + direction + searchResults.length) % searchResults.length;
		scrollActiveResultIntoView();
	}

	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				openSearchDropdown();
				moveSelectedIndex(1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				openSearchDropdown();
				moveSelectedIndex(-1);
				break;
			case 'Tab':
				// Make Tab behave like ArrowDown, Shift+Tab like ArrowUp
				e.preventDefault();
				if (e.shiftKey) {
					moveSelectedIndex(-1);
				} else {
					moveSelectedIndex(1);
				}
				break;
			case 'Home':
				if (!dropdownOpen || searchResults.length === 0) return;
				e.preventDefault();
				selectedIndex = 0;
				scrollActiveResultIntoView();
				break;
			case 'End':
				if (!dropdownOpen || searchResults.length === 0) return;
				e.preventDefault();
				selectedIndex = searchResults.length - 1;
				scrollActiveResultIntoView();
				break;
			case 'Enter':
				if (selectedIndex !== undefined && searchResults[selectedIndex] !== undefined) {
					e.preventDefault();
					submitResult(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				if (!dropdownOpen) return;
				e.preventDefault();
				closeSearchDropdown();
				inputElement?.blur();
				break;
		}
	}
</script>

<div class="relative mx-auto w-full max-w-sm" onfocusout={onFocusOut} {@attach attachContainer}>
	<label {...floating.reference({ class: 'input flex w-full items-center gap-2' })}>
		<Icon icon="search" size="sm" class="select-none" />
		<input
			{@attach attachInput}
			use:hotkey={{
				hotkey: Hotkeys.Search,
				action: (searchInput) => searchInput.focus()
			}}
			bind:value={searchInput}
			type="text"
			placeholder="Search"
			onfocus={openSearchDropdown}
			oninput={scheduleSearch}
			onkeydown={handleKeydown}
			class="min-w-0 flex-1"
			role="combobox"
			aria-autocomplete="list"
			aria-controls={listboxId}
			aria-expanded={dropdownOpen}
			aria-activedescendant={activeOptionId}
		/>
		{#if searchInput.length === 0}
			<kbd class="kbd kbd-sm shrink-0">⌘ K</kbd>
		{/if}
	</label>
	{#if dropdownOpen}
		<Portal>
			<div
				{...floating.floating({
					class:
						'floating bg-base-100 border-base-content/20 rounded-box z-[100] max-h-96 overflow-y-auto border shadow-lg',
					onpointerdown: onDropdownPointerDown,
					onmousedown: onDropdownPointerDown
				})}
				data-floating-scroll-area
			>
				<ul class="menu w-full" id={listboxId} role="listbox">
					{#if !isAboveThreshold}
						<li role="presentation">
							<span>Search for a game</span>
						</li>
					{:else if searchResults.length === 0 && internalLoading}
						<li role="presentation">
							<span>Searching...</span>
						</li>
					{:else}
						{#each searchResults as result, i (result.appid)}
							<li role="none">
								<button
									id={`${searchId}-option-${i}`}
									role="option"
									tabindex="-1"
									aria-selected={selectedIndex === i}
									class={selectedIndex === i ? 'menu-active' : ''}
									type="button"
									onclick={() => {
										submitResult(result);
									}}
									onmouseenter={() => {
										selectedIndex = i;
									}}
								>
									{result.name}
								</button>
							</li>
						{:else}
							<li role="presentation">
								<span>No results found</span>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
		</Portal>
	{/if}
</div>
