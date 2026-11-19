import { Accordion, AccordionItem } from '../../../../packages/components/src/components/Accordion'
import { Text } from '../../../../packages/components/src/components/Text'
import type { PlacementEntry } from './types'

// Placement (Usage tab): the one usage pattern as the Do, rendered from its
// pattern story; the Don't draws notFor[1], an accordion that never closes.
const SECTIONS = [
  { title: 'About this course', body: 'Color Theory II covers colour harmony, contrast and palettes for interfaces.' },
  { title: 'What you will learn', body: 'Build accessible palettes and check contrast between text and its background.' },
  { title: 'Who it is for', body: 'Product designers who already know the basics of colour.' },
]

export const placement: PlacementEntry[] = [
  {
    kind: 'do',
    source: { patterns: 'course-module-list' },
    caption: 'List course modules with the first open and the rest behind Show more, so readers open only what they need.',
  },
  {
    kind: 'dont',
    source: { notFor: 1 },
    caption: 'Keep every item open. The triggers add clicks for content that never hides; use Stack instead.',
    render: () => (
      <Accordion>
        {SECTIONS.map((s) => (
          <AccordionItem key={s.title} title={s.title} open onOpenChange={() => {}}>
            <Text>{s.body}</Text>
          </AccordionItem>
        ))}
      </Accordion>
    ),
  },
]
