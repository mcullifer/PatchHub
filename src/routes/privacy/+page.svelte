<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Privacy · PatchHub"
	description="How PatchHub collects, uses, and protects your data."
/>

<main class="mx-auto w-full max-w-2xl px-4 py-12">
	<div class="prose prose-a:text-primary prose-a:no-underline prose-a:hover:underline">
		<h1>Privacy</h1>

		<p>Last updated: July 20, 2026</p>

		<p>PatchHub is in beta. This page describes what data we handle and why.</p>

		<h2>What we collect</h2>

		<ul>
			<li>
				<strong>Account data</strong> — when you sign in, our authentication provider (<a
					href="https://workos.com/legal/privacy">WorkOS</a
				>) shares your email address and basic profile info. We store your email and username.
			</li>
			<li>
				<strong>Your content</strong> — projects and posts you create are stored in our database and,
				when published, are publicly visible.
			</li>
			<li>
				<strong>Usage analytics</strong> — we use
				<a href="https://posthog.com/privacy">PostHog</a> to understand how signed-in and signed-out
				visitors use PatchHub. This may include pages viewed, referring pages, navigation, clicks,
				form submissions, browser and device information, performance measurements, and events when
				features are used. <a href="https://posthog.com/privacy">PostHog</a> assigns anonymous
				visitor and session identifiers. If you sign in, we associate analytics with your account ID
				and username. We do not intentionally send passwords or form-field contents to
				<a href="https://posthog.com/privacy">PostHog</a>.
			</li>
			<li>
				<strong>Operational data</strong> — standard server logs, such as IP addresses and request metadata,
				used to run, secure, and debug the service.
			</li>
		</ul>

		<h2>How we use it</h2>

		<p>
			We use this data to operate PatchHub, sign you in, show your content, understand traffic and
			feature usage, measure performance, improve the product, prevent abuse, and debug problems. We
			don't sell your data.
		</p>

		<h2>Cookies and browser storage</h2>

		<p>
			<a href="https://posthog.com/privacy">PostHog</a> uses cookies and local storage to maintain
			anonymous visitor and session identifiers.
			<a href="https://workos.com/legal/privacy">WorkOS</a>
			and PatchHub also use storage that is necessary to keep you signed in and secure your account. Where
			required based on your location, we ask for permission before enabling analytics. If Analytics settings
			appears in the footer, you can use it to change your choice at any time. You can also clear or block
			browser storage in your browser settings, but doing so may reset your analytics identifier or affect
			sign-in.
		</p>

		<h2>Where it lives</h2>

		<p>
			PatchHub uses <a href="https://www.cloudflare.com/policies/privacy/">Cloudflare</a> (hosting
			and network services), <a href="https://www.convex.dev/legal/privacy">Convex</a> (database),
			<a href="https://workos.com/legal/privacy">WorkOS</a> (authentication), and
			<a href="https://posthog.com/privacy">PostHog</a> (analytics). Our
			<a href="https://www.convex.dev/legal/privacy">Convex</a> database and
			<a href="https://posthog.com/privacy">PostHog</a> analytics project are hosted in the United
			States. <a href="https://www.cloudflare.com/policies/privacy/">Cloudflare</a> may process requests
			near the location from which you access PatchHub. This means your data may be processed outside
			your country.
		</p>

		<h2>Your choices</h2>

		<p>
			You may ask us to access, correct, or delete your account information and content. You may
			also clear or block analytics identifiers through your browser settings. Contact us if you
			want to exercise a privacy right or have a question about this policy.
		</p>
	</div>
</main>
