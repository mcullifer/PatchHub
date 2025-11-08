<script lang="ts">
	import { Icon, MenuItem } from '$lib/components/common-ui';
	import Popover from '$lib/components/common-ui/floating/Popover.svelte';
	import Menu from '$lib/components/common-ui/Menu.svelte';
	import type { User } from '@workos/authkit-sveltekit';
	import type { ClassValue } from 'svelte/elements';

	let { class: classNames = '', user }: { class?: ClassValue; user: User } = $props();
	let open = $state(false);
</script>

<Popover bind:open opts={{ placement: 'bottom-end' }}>
	{#snippet reference(floating, interactions)}
		<button
			class="avatar btn btn-ghost btn-square"
			bind:this={floating.elements.reference}
			{...interactions.getReferenceProps()}
		>
			<div class={classNames}>
				<img src={user.profilePictureUrl} alt="Profile" />
			</div>
		</button>
	{/snippet}
	<Menu class="bg-base-100 rounded-box border-base-content/20 w-52 border">
		<div class="flex items-center gap-2 p-2">
			<div class="avatar">
				<div class={classNames}>
					<img src={user.profilePictureUrl} alt="Profile" />
				</div>
			</div>
			<div class="space-y-0">
				<div class="font-bold">
					{user.metadata?.username ? user.metadata.username : user.email}
				</div>
				<div class="font-normal opacity-70">{user.firstName} {user.lastName}</div>
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
