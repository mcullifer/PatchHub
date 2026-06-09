<script lang="ts">
	import { Icon, MenuItem } from '$lib/components/common-ui';
	import Popover from '$lib/components/common-ui/floating/Popover.svelte';
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

	let displayName = $derived(user.username ?? user.email);
	let fullName = $derived([user.firstName, user.lastName].filter(Boolean).join(' '));
</script>

<Popover bind:open opts={{ placement: 'bottom-end' }}>
	{#snippet reference(floating)}
		<button {...floating.reference({ class: 'avatar btn btn-ghost btn-square' })}>
			<div class={classNames}>
				{#if user.profilePictureUrl}
					<img src={user.profilePictureUrl} alt="Profile" />
				{:else}
					<Icon icon="person" />
				{/if}
			</div>
		</button>
	{/snippet}
	<Menu class="bg-base-100 rounded-box border-base-content/20 w-52 border">
		<div class="flex items-center gap-2 p-2">
			<div class="avatar">
				<div class={classNames}>
					{#if user.profilePictureUrl}
						<img src={user.profilePictureUrl} alt="Profile" />
					{:else}
						<Icon icon="person" />
					{/if}
				</div>
			</div>
			<div class="space-y-0">
				<div class="font-bold">
					{displayName}
				</div>
				{#if fullName}
					<div class="font-normal opacity-70">{fullName}</div>
				{/if}
			</div>
		</div>
		<MenuItem href="/profile">
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
</Popover>
