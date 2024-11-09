import { sveltekit } from '@sveltejs/kit/vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [webfontDownload(), sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		rollupOptions: {
			treeshake: true
		},
		minify: true
	}
});
