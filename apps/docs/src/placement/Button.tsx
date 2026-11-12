import { Button } from '../../../../packages/components/src/components/Button'
import { Card } from '../../../../packages/components/src/components/Card'
import { Heading } from '../../../../packages/components/src/components/Heading'
import { Image } from '../../../../packages/components/src/components/Image'
import { Inline } from '../../../../packages/components/src/components/Inline'
import { Stack } from '../../../../packages/components/src/components/Stack'
import { Text } from '../../../../packages/components/src/components/Text'
import type { PlacementEntry } from './types'

// Placement prototype (Usage tab): every Do is a usage pattern, rendered from
// its pattern story; every Don't illustrates the notFor / composition entry in
// its source, with a sample built here. Captions are a short reader-facing
// summary of that entry (at most 120 characters). Entries pair up row by row.

// A light, busy stand-in photo: the case where a transparent glyph vanishes.
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#f4ead8"/><stop offset=".55" stop-color="#d9c3a3"/><stop offset="1" stop-color="#f7f1e6"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><circle cx="128" cy="18" r="22" fill="#fbf6ee"/><path d="M0 70 40 46 70 62 110 38 160 64V90H0z" fill="#c9ad86"/></svg>',
)}`

const RepeatedCard = () => (
  <Card padding="sm">
    <Stack gap="sm">
      <Heading as="h3" size="title-small">Creative Acts</Heading>
      <Inline>
        <Button variant="accent" size="sm">Continue</Button>
      </Inline>
    </Stack>
  </Card>
)

export const placement: PlacementEntry[] = [
  { kind: 'do', source: { patterns: 'form-actions' }, caption: 'End a form or dialog with one accent Button for the decision and a neutral one to cancel.' },
  {
    kind: 'dont',
    source: { limits: 0 },
    caption: 'Use accent on two Buttons in one region. Accent marks the one main decision.',
    render: () => (
      <Inline gap="sm" justify="end">
        <Button variant="accent">Save draft</Button>
        <Button variant="accent">Publish</Button>
      </Inline>
    ),
  },
  { kind: 'do', source: { patterns: 'card-actions' }, caption: 'In a card, use neutral for its main action and transparent for a secondary one.' },
  {
    kind: 'dont',
    source: { limits: 1 },
    caption: 'Use accent inside repeated items. Every card would compete as the main action.',
    render: () => (
      <Inline gap="sm">
        <RepeatedCard />
        <RepeatedCard />
      </Inline>
    ),
  },
  { kind: 'do', source: { patterns: 'destructive-confirm' }, caption: "Use danger for a decision that deletes or can't be undone, next to a neutral Cancel." },
  {
    kind: 'dont',
    source: { notFor: 0 },
    caption: 'Use Button to go to another page. Anything that changes the URL is a TextLink.',
    render: () => (
      <Stack gap="sm">
        <Text>Twelve courses in this collection.</Text>
        <Inline>
          <Button variant="transparent" trailingIcon="chevron-right">View all courses</Button>
        </Inline>
      </Stack>
    ),
  },
  { kind: 'do', source: { patterns: 'hero-cta' }, caption: 'Give a hero or landing section one large accent Button for its main action.' },
  {
    kind: 'dont',
    source: { notFor: 1 },
    caption: "Put an icon Button over an image: its glyph can vanish. Use CardVertical's overlay parts.",
    render: () => (
      <div style={{ position: 'relative', width: 240 }}>
        <Image src={PHOTO} aspectRatio="16/9" />
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Button variant="transparent" shape="round" icon="heart" aria-label="Favorite" />
        </div>
      </div>
    ),
  },
]
