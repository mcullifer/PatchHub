<script lang="ts">
	import { resolve } from '$app/paths';
	import { Icon, MediaCard } from '$lib/components/common-ui';
	import type { getOwnerProfile } from '$lib/remote/projects.remote';

	type Project = Awaited<ReturnType<typeof getOwnerProfile>>['projects'][number];

	let { project, createdBy }: { project: Project; createdBy: string } = $props();

	let imageFailed = $state(false);
	const updatedAt = $derived(
		new Date(project.updatedAt).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	);
</script>

<MediaCard
	href={resolve('/[createdBy=owner]/[project]', { createdBy, project: project.slug })}
	title={project.name}
	description={project.description}
	actionLabel="Updates"
	class="aspect-[1200/630]"
>
	{#snippet media()}
		{#if project.bannerUrl && !imageFailed}
			<img
				class="h-full w-full object-cover"
				src={project.bannerUrl}
				alt=""
				loading="lazy"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<div class="grid h-full w-full place-items-center">
				<Icon icon="folder_open" size="xl" class="text-base-content/25" />
			</div>
		{/if}
	{/snippet}

	{#snippet meta()}
		<span class="inline-flex items-center gap-1 text-xs opacity-75">
			<Icon icon="calendar_month" size="xs" class="-ml-px" />
			Updated {updatedAt}
		</span>
	{/snippet}
</MediaCard>
