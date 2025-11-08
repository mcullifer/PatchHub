<script lang="ts">
	import Card from '$lib/components/common-ui/Card.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';
	import { setupAccount } from '$lib/remote/auth.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Account Setup - PatchHub</title>
</svelte:head>

<section class="hero my-auto">
	<div class="hero-content w-full max-w-md">
		<Card class="bg-base-100 border-base-content/10 w-full border shadow-xl">
			<div class="flex flex-col items-center gap-3">
				<div class="avatar avatar-placeholder">
					<div class="bg-primary/10 text-primary w-12 rounded-full">
						<Icon icon="person" />
					</div>
				</div>
				<h1 class="card-title justify-center text-center">Complete your account</h1>
				<p class="text-center text-sm opacity-70">Choose a username to finish setup.</p>
			</div>
			<div class="divider my-0"></div>

			<form {...setupAccount} class=" space-y-4">
				<fieldset class="fieldset">
					<label for="username" class="label">
						<span class="label-text">Username</span>
					</label>
					<label class="input w-full">
						<span class="opacity-60">@</span>
						<input
							{...setupAccount.fields.username.as('text')}
							id="username"
							placeholder={data.email?.split('@')[0] ?? 'username'}
						/>
					</label>
					{#if setupAccount.fields.username.issues()}
						{#each setupAccount.fields.username.issues() as issue, i (i)}
							<div role="alert" class="alert alert-error alert-soft mt-2">
								<Icon icon="error" class="text-error" size="sm" />
								<div>
									<span>{issue.message}</span>
								</div>
							</div>
						{/each}
					{/if}
				</fieldset>

				<button
					type="submit"
					class="btn btn-primary btn-block"
					disabled={setupAccount.pending > 0}
					class:loading={setupAccount.pending > 0}
				>
					{setupAccount.pending > 0 ? 'Creating Account...' : 'Create Account'}
				</button>
			</form>
		</Card>
	</div>
</section>
