import { Button } from '../../../../packages/components/src/components/Button'
import { Inline } from '../../../../packages/components/src/components/Inline'
import type { AccessibilityEntry } from './types'

export const accessibility: AccessibilityEntry = {
  useCases: [
    'Find the button and hear what it does.',
    'Reach it with the keyboard and press it.',
    'Know when it is disabled and skip past it.',
  ],
  labeling: {
    advice:
      'The visible label is the accessible name, so write it as the action ("Publish", not "Click here"). An icon-only Button has no visible label: TypeScript requires an aria-label for it.',
    caption: 'A label button is named by its text; its icon is hidden and not announced. An icon-only button needs aria-label.',
    marks: [
      { label: 'Label and icon', select: 'button:not([aria-label])' },
      { label: 'Icon only', select: 'button[aria-label]' },
    ],
    render: () => (
      <Inline gap="sm" align="center">
        <Button variant="neutral" trailingIcon="plus">Add</Button>
        <Button variant="transparent" shape="round" icon="heart" aria-label="Save course" />
      </Inline>
    ),
  },
  keyboard: {
    advice:
      'It works like a native button: Tab reaches it, Enter or Space presses it. A disabled Button leaves the tab order, so explain nearby why an action is unavailable.',
    caption: 'Focus shows the shared ring outside the button. Never remove it or replace it with a colour change.',
    render: () => <Button variant="accent">Publish</Button>,
  },
}
