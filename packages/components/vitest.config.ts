import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tier-2 behavioral a11y runner (ADR-008). jsdom + Testing Library asserts the
// dynamic ARIA contract — state attributes, focus, keyboard — plus an axe scan,
// for interactive components only. Scoped to *.a11y.test.tsx; the coverage gate
// (scripts/a11y-coverage.js) decides which components must have one.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.a11y.test.tsx'],
  },
})
