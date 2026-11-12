import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import svelteConfig from './apps/reference-studio/svelte.config.js';

export default tseslint.config(
	{
		ignores: [
			'**/.svelte-kit/**',
			'**/coverage/**',
			'**/dist/**',
			'**/node_modules/**',
			'**/playwright-report/**',
			'**/references/**',
			'**/screenshots/**',
			'**/test-results/**',
			'packages/create-svelte-builder/template/**',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	security.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'no-extra-boolean-cast': 'off',
			'no-undef': 'off',
			'no-useless-assignment': 'off',
			'no-useless-escape': 'warn',
			'preserve-caught-error': 'off',
			'security/detect-object-injection': 'off',
			'security/detect-non-literal-fs-filename': 'off',
			'security/detect-non-literal-regexp': 'off',
			'svelte/no-at-html-tags': 'off',
			'svelte/no-immutable-reactive-statements': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/prefer-writable-derived': 'off',
			'svelte/require-each-key': 'off',
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				svelteConfig,
			},
		},
	},
	prettier,
);
