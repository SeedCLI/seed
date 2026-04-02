import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: false,
		include: ['packages/**/tests/**/*.test.ts', 'examples/**/tests/**/*.test.ts'],
	},
});
