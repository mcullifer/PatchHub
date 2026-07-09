import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), webfontDownload(), sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', './tests/**/*.{test,spec}.{js,ts}'],
		server: {
			deps: {
				// Required by convex-test so vitest transforms its module glob imports
				inline: ['convex-test']
			}
		}
	},
	build: {
		rollupOptions: {
			treeshake: true
		},
		minify: true
	}
});
