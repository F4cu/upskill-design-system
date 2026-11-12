import { Box } from '../../../../packages/components/src/components/Box'
import { CardVertical } from '../../../../packages/components/src/components/CardVertical'
import type { AccessibilityEntry } from './types'

const noop = () => {}

const card = (
  <Box maxWidth={260}>
    <CardVertical
      size="sm"
      title="Designing Calm Interfaces"
      duration="9 Hours"
      certified
      progress={40}
      action={<CardVertical.Favorite onPressedChange={noop} />}
    />
  </Box>
)

export const accessibility: AccessibilityEntry = {
  useCases: [
    'Hear which course a card is about, and move from card to card.',
    'Save the course or open its menu without leaving the card.',
    'Hear how far through the course they are.',
  ],
  labeling: {
    advice:
      'The title names the card and its action button. Write titles that tell courses apart. The progress bar has its own short name, Completion, because the title is already read just before it. Describe the image with thumbnailAlt only when it adds something the title doesn’t.',
    caption: 'The title comes first, though the image sits on top. The image is skipped; duration, Certified, the bar and the Save button follow.',
    marks: [
      { label: 'Card', select: '[data-part="Root"]' },
      { label: 'Save button', select: '[data-part="Favorite"]' },
      { label: 'Progress', select: '[role="progressbar"]' },
      { label: 'Title', select: '[data-part="Title"]', side: 'left' },
      { label: 'Duration', select: '[data-part="Duration"]' },
      { label: 'Certified', select: '[data-part="Certified"]', side: 'right' },
    ],
    render: () => card,
  },
  keyboard: {
    advice:
      'The card itself is not a stop: Tab reaches only its Favorite or Menu button. The menu works like any menu: arrows move, Escape closes it and returns focus to the button.',
    caption: 'Focus lands on the action button and shows the shared ring. Don’t wrap the card in a link to make it focusable.',
    render: () => card,
  },
}
