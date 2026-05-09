<script lang="ts">
	import { Icon } from '$lib/components/common-ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const profile = $derived(data.profile);
	const displayName = $derived(profile.username ?? profile.email);
	const fullName = $derived([profile.firstName, profile.lastName].filter(Boolean).join(' '));
</script>

<svelte:head>
	<title>Profile - PatchHub</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
	<div class="flex items-center gap-4">
		<div class="avatar avatar-placeholder">
			<div class="bg-base-200 text-base-content w-16 rounded">
				{#if profile.profilePictureUrl}
					<img src={profile.profilePictureUrl} alt="Profile" />
				{:else}
					<Icon icon="person" size="lg" />
				{/if}
			</div>
		</div>
		<div class="min-w-0">
			<h1 class="truncate text-2xl font-bold">{displayName}</h1>
			{#if fullName}
				<p class="text-base-content/70 truncate">{fullName}</p>
			{/if}
		</div>
	</div>

	<div class="bg-base-100 border-base-content/10 overflow-hidden rounded border">
		<dl class="divide-base-content/10 divide-y">
			<div class="grid gap-1 p-4 sm:grid-cols-3 sm:gap-4">
				<dt class="text-base-content/70 text-sm">Username</dt>
				<dd class="sm:col-span-2">{profile.username}</dd>
			</div>
			<div class="grid gap-1 p-4 sm:grid-cols-3 sm:gap-4">
				<dt class="text-base-content/70 text-sm">Email</dt>
				<dd class="sm:col-span-2">{profile.email}</dd>
			</div>
			<div class="grid gap-1 p-4 sm:grid-cols-3 sm:gap-4">
				<dt class="text-base-content/70 text-sm">Joined</dt>
				<dd class="sm:col-span-2">{new Date(profile.createdAt).toLocaleDateString()}</dd>
			</div>
		</dl>
	</div>
</section>
