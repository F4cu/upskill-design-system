import { StoryRender } from '../components/stories'
import type { AccessibilityEntry } from './types'

// Labeling marks the course-module-list pattern (first item open). Keyboard
// uses FocusableContent: the open panel's link is a Tab stop, the closed
// panel's link is hidden (until-found) and skipped.
export const accessibility: AccessibilityEntry = {
  useCases: [
    "Hear each section's title, and whether it is open or closed, from its button.",
    'Open and close a section with Enter or Space.',
    "Tab through an open section's links and skip the content of closed ones.",
    'Jump between sections by heading, since each trigger sits inside one.',
  ],
  labeling: {
    advice:
      'The title names each button and its panel. The subtitle is read as the button’s description on every item, so keep it to one short fact, such as a duration. Set headingLevel to fit the page outline (h3 by default).',
    caption: 'Each trigger is a button inside a heading, named by its title and described by its meta line. Its panel is a group named by the title.',
    marks: [
      { label: 'Heading', select: '[data-part="Heading"]' },
      { label: 'Trigger', select: '[data-part="Trigger"]' },
      { label: 'Meta', select: '[data-part="Meta"]' },
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
