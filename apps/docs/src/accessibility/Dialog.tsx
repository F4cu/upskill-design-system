import { StoryRender } from '../components/stories'
import type { AccessibilityEntry } from './types'

// Both figures render the confirm-action pattern staged (inert, non-modal),
// so nothing on the page moves focus; names and Tab stops are read from the
// DOM, which inert leaves as it is.
const ConfirmAction = () => <StoryRender name="Dialog" file="patterns.stories" exportName="ConfirmAction" />

export const accessibility: AccessibilityEntry = {
  useCases: [
    "Hear the dialog's title, and its description when there is one, as soon as it opens.",
    'Close it with Escape or the Close button and land back on the control that opened it.',
    'Reach every control in the dialog with Tab, without reaching the page behind a modal dialog.',
    "Start on the safe choice, such as Cancel, when the action can't be undone.",
  ],
  labeling: {
    advice:
      'The title names the dialog and the description is read with it, so write the title as the question or task ("Remove this course?"). The Close button is labelled for you and comes right after the title.',
    caption: 'The dialog is named by its title and described by its description. The icon-only Close button has its own label.',
    marks: [
      { label: 'Dialog', select: 'dialog' },
      { label: 'Title', select: '[data-part="Title"]' },
      { label: 'Close', select: '[data-part="Close"]' },
      { label: 'Description', select: '[data-part="Description"]' },
    ],
    render: ConfirmAction,
  },
  keyboard: {
    advice:
      'Escape and the Close button close the dialog, and focus goes back to the control that opened it. Focus starts on the title; to start on Cancel instead, mark it data-autofocus, never with React\'s autoFocus.',
    caption: "Focus opens on Cancel, so Enter can't remove the course by accident. Tab moves on to Remove, then wraps to Close.",
    focusTarget: '[data-autofocus]',
    order: true,
    orderNearest: true,
    orderFrom: '[data-autofocus]',
    render: ConfirmAction,
  },
}
