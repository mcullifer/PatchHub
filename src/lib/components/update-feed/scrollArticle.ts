import { tick } from 'svelte';

export async function scrollArticleIntoView(sectionId: string): Promise<void> {
	await tick();

	const articleSection = document.getElementById(sectionId);
	if (!articleSection) return;

	if (articleSection.getBoundingClientRect().top < 96) {
		articleSection.scrollIntoView({ block: 'start' });
	}
}
