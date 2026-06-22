// Matcher type augmentation for the behavioral a11y tests (ADR-008). jest-dom
// self-augments `module 'vitest'` on import; vitest-axe only augments the stale
// `Vi` global namespace, so map its matchers onto vitest v3's Assertion here.
// Excluded from the published build.
import '@testing-library/jest-dom/vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
