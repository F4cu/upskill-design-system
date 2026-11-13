import { Box } from '../../../../packages/components/src/components/Box'
import { CardVertical } from '../../../../packages/components/src/components/CardVertical'
import { Inline } from '../../../../packages/components/src/components/Inline'
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

const courses = [
  { title: 'Designing Calm Interfaces', duration: '9 Hours' },
  { title: 'Creative Acts for Curious People', duration: '12 Hours' },
]

export const accessibility: AccessibilityEntry = {
  useCases: [
    'Hear which course a card is about, and move from card to card.',
    'Open the course, save it or open its menu without leaving the card.',
    'Hear how far through the course they are.',
  ],
  labeling: {
    advice:
      'The card has no name of its own: its heading is read first, so a name would only repeat it. The action button adds the title to its own name so it is unique across cards. Write titles that tell courses apart. The progress bar has its own short name, Completion, because the title is already read just before it. Describe the image with thumbnailAlt only when it adds something the title doesn’t.',
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
      'With href, the title is a link that covers the whole card: Tab reaches it first, then the Favorite or Menu button, then the next card. Without href, the action button is the card’s only stop. Focus follows the DOM, so keep cards in reading order. The menu works like any menu: arrows move, Escape closes it and returns focus to the button.',
    caption: 'Each linked card is two stops: the link, ringed on the thumbnail, then Save. Shift+Tab walks back.',
    focusTarget: '[data-part="TitleLink"]',
    order: true,
    tableRows: 2,
    ringOn: (stop) =>
      stop.matches('[data-part="TitleLink"]') ? (stop.closest('[data-part="Root"]')?.querySelector('[data-part="Thumbnail"]') ?? null) : null,
    render: () => (
      <Inline gap="md">
        {courses.map((c, i) => (
          <Box key={c.title} maxWidth={220}>
            <CardVertical
              size="sm"
              title={c.title}
              href={`#course-${i + 1}`}
              duration={c.duration}
              action={<CardVertical.Favorite onPressedChange={noop} />}
            />
          </Box>
        ))}
      </Inline>
    ),
  },
}
