<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Privacy · PatchHub"
	description="How PatchHub collects, uses, and protects your data."
/>

<main class="mx-auto w-full max-w-2xl px-4 py-12">
	<div class="prose">
		<h1>Privacy</h1>

		<p>Last updated: July 18, 2026</p>

		<p>PatchHub is in beta. This page describes what data we handle and why.</p>

		<h2>What we collect</h2>

		<ul>
			<li>
				<strong>Account data</strong> — when you sign in, our authentication provider (WorkOS) shares
				your email address and basic profile info. We store your email and username.
			</li>
			<li>
				<strong>Your content</strong> — projects and posts you create are stored in our database and,
				when published, are publicly visible.
			</li>
			<li>
				<strong>Operational data</strong> — standard server logs (such as IP addresses and request metadata)
				used to run and protect the service. We don't run third-party ad or analytics trackers.
			</li>
		</ul>

		<h2>How we use it</h2>

		<p>
			To operate PatchHub: signing you in, showing your content, preventing abuse, and debugging
			problems. We don't sell your data.
		</p>

		<h2>Where it lives</h2>

		<p>
			PatchHub runs on Cloudflare (hosting), Convex (database), and WorkOS (authentication). Each
			processes data only to provide the service.
		</p>

		<h2>Your choices</h2>

		<p>Want your account or content removed? Let us know and we'll take care of it.</p>
	</div>
</main>
