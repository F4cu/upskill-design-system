import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Story axe sweep (issue #72, ADR-008 amendment). Composes every CSF story via
// portable stories and runs an axe scan on its initial render — baseline a11y
// coverage that grows with each new story, no per-component test file. Kept in
// jsdom deliberately: ADR-008 rejected a real-browser runner, so layout-
// dependent rules (color-contrast) stay with tokens:contrast-check.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', './vitest.stories.setup.ts'],
    include: ['src/a11y-stories.sweep.test.tsx'],
  },
})
