import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'

// vitest-axe/extend-expect ships the types but an empty runtime, so wire the
// matchers in explicitly. jest-dom/vitest self-registers on import above.
expect.extend(axeMatchers)

// Unmount between tests — without globals enabled, Testing Library's auto
// afterEach cleanup isn't registered, so renders would otherwise accumulate.
afterEach(() => cleanup())
