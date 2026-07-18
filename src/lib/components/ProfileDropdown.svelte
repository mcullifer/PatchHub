<script lang="ts">
	import { resolve } from '$app/paths';
	import { Icon, MenuItem } from '$lib/components/common-ui';
	import Dropdown from '$lib/components/common-ui/floating/Dropdown.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import type { ClassValue } from 'svelte/elements';

	type ProfileUser = {
		email: string;
		firstName: string | null;
		lastName: string | null;
		profilePictureUrl: string | null;
		username: string | null;
	};

	let { class: classNames = '', user }: { class?: ClassValue; user: ProfileUser } = $props();
	let open = $state(false);

	let username = $derived(user.username);
	let primaryName = $derived(username ? `${username}` : user.email);
	let secondaryText = $derived(username ? user.email : null);
	let profileHref = $derived(
		username ? resolve('/[createdBy=owner]', { createdBy: username }) : '/auth/setup'
	);
</script>

{#snippet pfp(url: string | null)}
	{#if url}
		<img src={url} alt="Profile" />
	{:else}
		<Icon icon="person" />
	{/if}
{/snippet}

<Dropdown bind:open opts={{ placement: 'bottom-end' }}>
	{#snippet activator(floating)}
		<button {...floating.reference({ class: 'avatar btn btn-ghost btn-square' })}>
			<div class={classNames}>
				{@render pfp(user.profilePictureUrl)}
			</div>
		</button>
	{/snippet}
	<Menu class="bg-base-100 rounded-box border-base-content/15 w-56 border">
		<li class="menu-title">
			<div class="flex items-center gap-3">
				<div class="avatar {user.profilePictureUrl ? '' : 'avatar-placeholder'}">
					<div class="bg-base-200 text-base-content/70 w-8 rounded">
						{@render pfp(user.profilePictureUrl)}
					</div>
				</div>
				<div class="flex min-w-0 flex-col">
					<span class="text-base-content truncate text-sm font-semibold normal-case">
						{primaryName}
					</span>
					{#if secondaryText}
						<span class="text-base-content/60 truncate text-xs font-normal normal-case">
							{secondaryText}
						</span>
					{/if}
				</div>
			</div>
		</li>
		<li class="border-base-content/10 my-1 border-t" aria-hidden="true"></li>
		<MenuItem href={profileHref}>
			<Icon icon="person" size="sm" />
			Profile
		</MenuItem>
		<MenuItem href="/settings">
			<Icon icon="settings" size="sm" />
			Settings
		</MenuItem>
		<MenuItem href="/auth/logout">
			<Icon icon="logout" size="sm" />
			Logout
		</MenuItem>
	</Menu>
</Dropdown>
