import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

// Flat config. Scope is the components package source — the component loop's
// Stage 3 lints the new component's files, not the whole repo. jsx-a11y is the
// a11y gate (ADR-007); static linting only, no runtime DOM harness.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/storybook-static/**',
      '**/node_modules/**',
      'packages/tokens/build/**',
    ],
  },
  {
    files: ['packages/components/src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Type-augmentation declaration files merge matchers into library
    // interfaces (e.g. vitest's Assertion), which requires empty interfaces
    // that extend a single supertype — a legitimate declaration-merging idiom.
    files: ['packages/components/src/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },
)
