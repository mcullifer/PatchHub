import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				// https://github.com/sveltejs/eslint-plugin-svelte/issues/848
				// Disable experimentalGenerics after this PR is closed
				// https://github.com/sveltejs/rfcs/pull/38
				svelteFeatures: {
					experimentalGenerics: true
				}
			}
		}
	},
	{
		ignores: [
			'static/scripts/',
			'build/',
			'.svelte-kit/',
			'dist/',
			'.DS_Store',
			'node_modules',
			'/package',
			'.env',
			'.env.*',
			'!.env.example',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock',
			'tailwind.config.cjs'
		]
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': 'warn',
			'prefer-const': 'off',
			'@typescript-eslint/no-unused-expressions': 'off'
		}
	}
];
