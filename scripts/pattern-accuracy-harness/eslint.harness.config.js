// Mirrors the repo's eslint.config.js rule set but matches any path — the root
// config scopes its rules to packages/components/src/**, which would silently
// skip files in harness scratch dirs.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

export default tseslint.config({
  files: ['**/*.{ts,tsx}'],
  extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
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
})
