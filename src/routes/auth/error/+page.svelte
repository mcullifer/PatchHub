<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
	import Card from '$lib/components/common-ui/Card.svelte';
	import Icon from '$lib/components/common-ui/Icon.svelte';

	type AuthErrorDetails = {
		title: string;
		message: string;
		alertClass: string;
		icon: string;
		iconClass: string;
	};

	const code = $derived(page.url.searchParams.get('code'));
	const details = $derived(getAuthErrorDetails(code));

	function getAuthErrorDetails(code: string | null): AuthErrorDetails {
		if (code === 'account_disabled') {
			return {
				title: 'Account unavailable',
				message:
					'This PatchHub account is disabled. Contact support if you think this is a mistake.',
				alertClass: 'alert-error',
				icon: 'block',
				iconClass: 'text-error-content'
			};
		}

		if (code === 'ACCESS_DENIED') {
			return {
				title: 'Sign-in was canceled',
				message: 'PatchHub did not receive approval to complete sign-in.',
				alertClass: 'alert-warning',
				icon: 'warning',
				iconClass: 'text-warning-content'
			};
		}

		return {
			title: 'Sign-in could not be completed',
			message: 'Something went wrong while finishing sign-in. Please try again.',
			alertClass: 'alert-warning',
			icon: 'error',
			iconClass: 'text-warning-content'
		};
	}
</script>

<Seo
	title="Authentication Error - PatchHub"
	description="Something went wrong while signing you in to PatchHub."
	noindex
/>

<section
	class="bg-base-100 text-base-content flex min-h-[60vh] items-center justify-center px-4 py-10"
>
	<Card class="border-base-content/20 w-full max-w-md border shadow-xl">
		<div role="alert" class={['alert', details.alertClass]}>
			<Icon icon={details.icon} class={details.iconClass} />
			<span>{details.title}</span>
		</div>

		<p class="text-base-content/70">{details.message}</p>

		<div class="flex flex-col justify-end gap-2 sm:flex-row">
			<a class="btn btn-primary" href={resolve('/auth/login')}>Try signing in again</a>
			<a class="btn btn-ghost" href={resolve('/')}>Go home</a>
		</div>
	</Card>
</section>
