import { addons } from 'storybook/manager-api'
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events'
import { darkTheme, lightTheme } from './theme'

// The theme toolbar toggle only re-themes the preview (component data-theme).
// Storybook's chrome is themed separately and does not follow it, so mirror the
// `theme` global onto the manager — flipping the toggle flips the whole Storybook.
// Global changes surface through the manager *API* event bus (api.on), not the
// raw postMessage channel, so this must run inside a registered manager addon.
addons.setConfig({ theme: lightTheme })

addons.register('chrome-theme-sync', (api) => {
  const sync = (globals?: { theme?: string }) => {
    addons.setConfig({ theme: globals?.theme === 'dark' ? darkTheme : lightTheme })
  }
  api.on(SET_GLOBALS, ({ globals }: { globals: { theme?: string } }) => sync(globals))
  api.on(GLOBALS_UPDATED, ({ globals }: { globals: { theme?: string } }) => sync(globals))
})
