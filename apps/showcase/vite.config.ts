import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // '/upskill-design-system/' when building for GitHub Pages (deploy workflow
  // sets VITE_BASE_PATH); '/' for local dev and CI checks
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
  },
})
