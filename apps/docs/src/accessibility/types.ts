import type { ReactElement } from 'react'

// Reader-facing accessibility guidance (prototype, Accessibility tab). The
// spec's `accessibility` block stays the full contract, for engineers and
// agents; this holds the short, practical version: what people must be able
// to do, how the component gets its names, and how it behaves on a keyboard.
export type AccessibilityFigure = {
  // One or two plain sentences, at most 120 characters, read under the image.
  caption: string
  render: () => ReactElement
}

// A descriptive label for the badge and the CSS selector of the element it
// points at, inside the rendered sample. `side` pins the badge to one gutter
// when neighbours on one line would crowd it (CardVertical's meta row).
export type AccessibilityMark = { label: string; select: string; side?: 'left' | 'right' }

export type AccessibilityEntry = {
  // What a person using assistive technology must be able to do.
  useCases: string[]
  // How the component's accessible names are set, as advice to the consumer.
  // The image labels each element in `marks` the way the Spec anatomy does;
  // the table under it shows its markup and what a screen reader announces,
  // both read from the rendered element.
  labeling: AccessibilityFigure & { advice: string; marks: AccessibilityMark[] }
  // One or two sentences in place of the key-by-key table. The image shows
  // the focus ring on the element `focusTarget` selects (the first focusable
  // element when omitted).
  // With `order`, every Tab stop in the sample gets a badge with its position
  // in focus (DOM) order, and a table lists what each one announces.
  // `ringOn` returns the element that draws a stop's focus ring when it isn't
  // the stop itself (CardVertical's link rings the thumbnail); the badge and
  // the forced ring go there.
  keyboard: AccessibilityFigure & {
    advice: string
    focusTarget?: string
    order?: boolean
    // Table rows to keep when the sample repeats (the first card's stops).
    tableRows?: number
    ringOn?: (stop: Element) => Element | null
  }
}
