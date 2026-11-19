import { StoryRender } from '../components/stories'
import type { AccessibilityEntry } from './types'

// Labeling marks the course-module-list pattern (first item open). Keyboard
// uses FocusableContent: the open panel's link is a Tab stop, the closed
// panel's link is inert and skipped.
export const accessibility: AccessibilityEntry = {
  useCases: [
    "Hear each section's title, and whether it is open or closed, from its button.",
    'Open and close a section with Enter or Space.',
    "Tab through an open section's links and skip the content of closed ones.",
    'Jump between sections by heading, since each trigger sits inside one.',
  ],
  labeling: {
    advice:
      'The title and subtitle name each button, and the button names its panel, so keep the subtitle to one short fact, such as a duration. Set headingLevel to fit the page outline (h3 by default).',
    caption: 'Each trigger is a button inside a heading, named by its title and subtitle. Its panel is a region named by it.',
    marks: [
      { label: 'Heading', select: '[data-part="Heading"]' },
      { label: 'Trigger', select: '[data-part="Trigger"]' },
      { label: 'Subtitle', select: '[data-part="Subtitle"]' },
      { label: 'Panel', select: '[data-part="Panel"]' },
    ],
    render: () => <StoryRender name="Accordion" file="patterns.stories" exportName="CourseModuleList" />,
  },
  keyboard: {
    advice:
      'Tab reaches each trigger, and Enter or Space opens or closes it. Content in a closed panel is skipped; if a section closes while focus is inside it, focus goes back to its trigger.',
    caption: 'Tab moves from a trigger into its open panel, then on to the next trigger. Links in a closed panel are skipped.',
    order: true,
    orderSide: 'left',
    render: () => <StoryRender name="Accordion" file="stories" exportName="FocusableContent" />,
  },
}
