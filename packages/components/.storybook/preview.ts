import type { Decorator, Preview } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import { upskillTheme } from './theme'
import '../src/styles/tokens.css'
import '../src/styles/reset.css'
import '../src/styles/grid.css'

const withBrand: Decorator = (Story, context) => {
  document.documentElement.setAttribute('data-brand', context.globals.brand)
  return Story()
}

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    withBrand,
  ],
  globalTypes: {
    brand: {
      description: 'Brand',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: ['upskill', 'horizon'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { brand: 'upskill' },
  parameters: {
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Components', 'Typography', 'Layout', ['Box', 'Inline', 'Stack', 'Examples']],
      },
    },
    docs: {
      theme: upskillTheme,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
