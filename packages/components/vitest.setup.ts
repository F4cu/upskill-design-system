import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'

// vitest-axe/extend-expect ships the types but an empty runtime, so wire the
// matchers in explicitly. jest-dom/vitest self-registers on import above.
expect.extend(axeMatchers)

// jsdom 25 has HTMLDialogElement but none of its methods. These stand-ins only
// toggle the open attribute and fire close; they don't emulate inertness or
// the top layer, which Dialog's a11y test leaves to the browser. close fires
// in a later task, as in browsers, so a reopen in between is observable.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    setTimeout(() => this.dispatchEvent(new Event('close')), 0)
  }
}

// Unmount between tests — without globals enabled, Testing Library's auto
// afterEach cleanup isn't registered, so renders would otherwise accumulate.
afterEach(() => cleanup())
