import { create } from 'storybook/theming/create'

const shared = {
  fontBase: '"Roboto", sans-serif',
  fontCode: '"Roboto Mono", monospace',
}

// Manager (chrome) themes. Kept in sync with the preview's data-theme toggle by
// the channel subscription in manager.ts, so the whole Storybook flips together.
export const lightTheme = create({ base: 'light', ...shared })
export const darkTheme = create({ base: 'dark', ...shared })

// Back-compat: preview.ts uses this for the Docs addon theme.
export const upskillTheme = lightTheme
