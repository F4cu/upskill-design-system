import { Button } from '../../../../packages/components/src/components/Button'
import { Dialog } from '../../../../packages/components/src/components/Dialog'
import { Text } from '../../../../packages/components/src/components/Text'
import type { PlacementEntry } from './types'

// Placement (Usage tab): each Do is a usage pattern, rendered from its pattern
// story; each Don't draws the notFor / composition entry in its source.
// Placement renders a hand-built sample staged, so it passes nonModal itself.
const ignore = () => {}

export const placement: PlacementEntry[] = [
  {
    kind: 'do',
    source: { patterns: 'confirm-action' },
    caption: 'Confirm an action: its consequence in the description, a neutral Cancel and one danger or accent Button.',
  },
  {
    kind: 'dont',
    source: { donts: 5 },
    caption: 'Use two accent Buttons in actions. Accent marks the one action the dialog exists for.',
    render: () => (
      <Dialog
        open
        nonModal
        onOpenChange={ignore}
        title="Publish this course?"
        actions={
          <>
            <Button variant="accent">Save draft</Button>
            <Button variant="accent">Publish</Button>
          </>
        }
      />
    ),
  },
  {
    kind: 'do',
    source: { patterns: 'edit-form' },
    caption: 'Edit a few fields of one record in place: fields in the body, Cancel and Save in actions.',
  },
  {
    kind: 'dont',
    source: { notFor: 0 },
    caption: "Open a dialog to say something was saved. It takes focus for news nobody needs to act on.",
    render: () => (
      <Dialog open nonModal onOpenChange={ignore} title="Profile saved" actions={<Button variant="accent">OK</Button>}>
        <Text color="subtle">Your changes are saved.</Text>
      </Dialog>
    ),
  },
]
