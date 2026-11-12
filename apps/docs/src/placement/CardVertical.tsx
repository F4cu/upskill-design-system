import { Badge } from '../../../../packages/components/src/components/Badge'
import { Box } from '../../../../packages/components/src/components/Box'
import { CardVertical } from '../../../../packages/components/src/components/CardVertical'
import type { PlacementEntry } from './types'

// Placement prototype (Usage tab): every Do is a usage pattern, rendered from
// its pattern story; every Don't illustrates the notFor / composition entry in
// its source, with a sample built here. Captions are a short reader-facing
// summary of that entry (at most 120 characters). Entries pair up row by row.

const noop = () => {}

export const placement: PlacementEntry[] = [
  { kind: 'do', source: { patterns: 'favorite-saved' }, caption: 'Let the learner save a course in place with the Favorite action over the image.' },
  {
    kind: 'dont',
    source: { donts: 4 },
    caption: 'Add a Completed badge yourself: it can disagree with the bar. Pass progress={100} instead.',
    render: () => (
      <Box maxWidth={280}>
        <CardVertical.Root size="lg">
          <CardVertical.Body>
            <CardVertical.Title>Designing Calm Interfaces</CardVertical.Title>
            <CardVertical.Meta>
              <CardVertical.Duration>9 Hours</CardVertical.Duration>
              <Badge>Completed</Badge>
            </CardVertical.Meta>
          </CardVertical.Body>
          <CardVertical.Progress value={40} />
          <CardVertical.Media alt="">
            <CardVertical.Action>
              <CardVertical.Favorite onPressedChange={noop} />
            </CardVertical.Action>
          </CardVertical.Media>
        </CardVertical.Root>
      </Box>
    ),
  },
  { kind: 'do', source: { patterns: 'overflow-menu' }, caption: "Put several course actions (share, save, hide) in the Menu action when they don't fit as buttons." },
  {
    kind: 'dont',
    source: { notFor: 0 },
    caption: 'Use CardVertical for content that isn’t a course, like an article. Build it from Card.',
    render: () => (
      <Box maxWidth={280}>
        <CardVertical size="sm" title="Five Takeaways from Our Team Offsite" duration="5 min read" />
      </Box>
    ),
  },
]
