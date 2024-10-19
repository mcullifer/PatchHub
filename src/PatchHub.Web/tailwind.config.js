import tailwindTypography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';
import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [
      tailwindTypography,
      containerQueries,
      daisyui
  ],
	daisyui: {
		themes: true,
		base: true,
		styled: true,
		utils: true
	}
};

