import { dirname } from 'path'
import { fileURLToPath } from 'url'
import type { StorybookConfig } from '@storybook/react-vite'

// @types/node is intentionally not a dependency; declare the one field we read.
declare const process: { env: Record<string, string | undefined> }

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-themes'),
  ],
  framework: getAbsolutePath('@storybook/react-vite') as StorybookConfig['framework'],
  // Served from a subpath under GitHub Pages in CI (STORYBOOK_BASE_PATH);
  // local `storybook dev` and root-served builds keep the default '/'.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    base: process.env.STORYBOOK_BASE_PATH ?? '/',
  }),
}

export default config
