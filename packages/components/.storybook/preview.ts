import type { Preview } from '@storybook/react-vite'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import { upskillTheme } from './theme'
import '../src/styles/tokens.css'
import '../src/styles/reset.css'
import '../src/styles/grid.css'

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
  ],
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
