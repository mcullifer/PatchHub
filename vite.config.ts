import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess({ style: true }),
			adapter: adapter(),
			alias: {
				$convex: 'src/convex'
			},
			experimental: {
				remoteFunctions: true
			},
			version: {
				name: pkg.version
			},
			compilerOptions: {
				experimental: {
					async: true
				}
			}
		})
	],

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
