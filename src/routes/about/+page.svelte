<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="About PatchHub"
	description="Why PatchHub exists and its goal of becoming the place where projects publish and people read updates."
/>

<main class="overflow-hidden">
	<section class="border-base-300 border-b">
		<div class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
			<p class="text-base-content/50 mb-4 text-sm font-semibold tracking-[0.2em] uppercase">
				About PatchHub
			</p>
			<h1 class="max-w-4xl text-5xl leading-[0.95] font-black tracking-tighter sm:text-7xl">
				One place for <span class="text-primary">updates.</span>
			</h1>
			<p class="text-base-content/70 mt-8 max-w-2xl text-xl leading-relaxed sm:text-2xl">
				I've been building PatchHub in one form or another since 2022.
			</p>
		</div>
	</section>

	<section class="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
		<div class="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
			<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">I just really like patch notes.</h2>
			<div class="text-base-content/70 space-y-5 text-lg leading-relaxed">
				<p>
					Steam game updates are on Steam. Some games put their patch notes on their own sites.
					Phone apps, of course, give you the incredibly useful “Bug fixes and performance
					improvements” every single time. Software updates might have a proper changelog, or they
					might be hiding on some random page you would never think to check. It's all over the
					place.
				</p>
				<p>
					I wanted one place where I could follow all of it without having to remember where every
					game, app, or project decided to post updates. So I started making PatchHub.
				</p>
			</div>
		</div>
	</section>

	<section class="bg-base-200 border-base-300 border-y">
		<div class="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
			<div class="mb-10 max-w-2xl">
				<p class="text-base-content/50 mb-3 text-sm font-semibold tracking-[0.2em] uppercase">
					The rebuilds
				</p>
				<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
					I've rebuilt this thing a few times.
				</h2>
			</div>

			<ul class="timeline timeline-vertical timeline-snap-icon timeline-compact">
				<li>
					<div class="timeline-middle" aria-hidden="true">
						<span class="bg-base-content block size-3 rounded-full"></span>
					</div>
					<div class="timeline-end pb-10">
						<p class="text-base-content/50 text-sm font-semibold tracking-wider uppercase">2022</p>
						<h3 class="mt-1 text-2xl font-bold">Blazor Server</h3>
						<p class="text-base-content/65 mt-2 max-w-xl">
							Blazor was still pretty new when I tried it, and it's basically how I learned web
							development. I loved being able to build a web app in C#, but I also kept running into
							the edges of an early framework.
						</p>
					</div>
					<hr />
				</li>
				<li>
					<hr />
					<div class="timeline-middle" aria-hidden="true">
						<span class="bg-base-content block size-3 rounded-full"></span>
					</div>
					<div class="timeline-end pb-10">
						<p class="text-base-content/50 text-sm font-semibold tracking-wider uppercase">Then</p>
						<h3 class="mt-1 text-2xl font-bold">Svelte + C# backend</h3>
						<p class="text-base-content/65 mt-2 max-w-xl">
							It became pretty clear that I needed to learn JavaScript. That's how I found Svelte.
							React never really clicked for me, but Svelte felt weirdly familiar, almost like
							Blazor with JavaScript. I rebuilt the frontend and kept the C# backend.
						</p>
					</div>
					<hr />
				</li>
				<li>
					<hr />
					<div class="timeline-middle" aria-hidden="true">
						<span class="bg-primary block size-3 rounded-full"></span>
					</div>
					<div class="timeline-end">
						<p class="text-base-content/50 text-sm font-semibold tracking-wider uppercase">Now</p>
						<h3 class="mt-1 text-2xl font-bold">SvelteKit</h3>
						<p class="text-base-content/65 mt-2 max-w-xl">
							Eventually I went all-in on SvelteKit. It brought back the full-stack setup I liked
							about Blazor, and it fits how I like building web apps.
						</p>
					</div>
				</li>
			</ul>
		</div>
	</section>

	<section class="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
		<div class="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
			<article class="card border-base-content/20 bg-base-100 border">
				<div class="card-body gap-4">
					<p class="text-base-content/50 text-sm font-semibold tracking-[0.2em] uppercase">
						Right now
					</p>
					<h2 class="card-title text-2xl">We pull updates from other places.</h2>
					<p class="text-base-content/65 leading-relaxed">
						That's what makes PatchHub useful now, while there aren't many people posting their own
						updates here yet.
					</p>
				</div>
			</article>

			<div
				class="text-base-content/30 hidden items-center px-2 text-3xl md:flex"
				aria-hidden="true"
			>
				→
			</div>

			<div class="aura aura-gold aura-lg rounded-box">
				<article class="card bg-base-200 h-full">
					<div class="card-body gap-4">
						<p class="text-base-content/50 text-sm font-semibold tracking-[0.2em] uppercase">
							The goal
						</p>
						<h2 class="card-title text-2xl">People post their updates here.</h2>
						<p class="text-base-content/65 leading-relaxed">
							That's what I actually want PatchHub to be. If it works, we won't need all the
							external stuff anymore because the updates will already be here.
						</p>
					</div>
				</article>
			</div>
		</div>

		<div
			class="border-base-300 mt-14 flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-base-content/65 max-w-xl">
				Four years later, it's still a beta and I'm still figuring out what the best version of this
				looks like.
			</p>
			<a class="link link-hover font-semibold" href="https://github.com/mcullifer/PatchHub">
				Follow the work on GitHub →
			</a>
		</div>
	</section>
</main>
