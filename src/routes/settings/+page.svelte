<script lang="ts">
	import { resolve } from '$app/paths';
	import { resetAnalyticsIdentity } from '$lib/analytics/logout';
	import Seo from '$lib/components/Seo.svelte';
	import { Icon } from '$lib/components/common-ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo title="Settings - PatchHub" description="Manage your PatchHub account settings." noindex />

<section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
	<div>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-base-content/70 mt-1 text-sm">{data.account.email}</p>
	</div>

	<div class="bg-base-100 border-base-content/10 rounded border">
		<div class="border-base-content/10 border-b p-4">
			<h2 class="font-semibold">Account</h2>
		</div>
		<div class="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
			<div>
				<p class="font-medium">Username</p>
				<p class="text-base-content/70 text-sm">{data.account.username}</p>
			</div>
			<a
				class="btn btn-outline btn-sm"
				href={resolve('/[createdBy=owner]', { createdBy: data.account.username })}
			>
				<Icon icon="person" size="sm" />
				View profile
			</a>
		</div>
	</div>

	<div class="bg-base-100 border-base-content/10 rounded border">
		<div class="border-base-content/10 border-b p-4">
			<h2 class="font-semibold">Session</h2>
		</div>
		<div class="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
			<div>
				<p class="font-medium">Sign out of PatchHub</p>
				<p class="text-base-content/70 text-sm">You can sign back in at any time.</p>
			</div>
			<form method="POST" action={resolve('/auth/logout')} onsubmit={resetAnalyticsIdentity}>
				<button type="submit" class="btn btn-error btn-outline btn-sm">
					<Icon icon="logout" size="sm" />
					Logout
				</button>
			</form>
		</div>
	</div>
</section>
