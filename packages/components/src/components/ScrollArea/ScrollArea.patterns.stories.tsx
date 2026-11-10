import type { Meta, StoryObj } from '@storybook/react'
import { ScrollArea } from './index'
import { Box } from '../Box'
import { CardVertical } from '../CardVertical'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { Text } from '../Text'

const COURSES = [
  { title: 'Change by Design', duration: '12 Hours' },
  { title: 'Creative Confidence', duration: '8 Hours' },
  { title: 'The Design of Everyday Things', duration: '10 Hours' },
  { title: 'The Design Thinking Playbook', duration: '6 Hours' },
]

const LESSONS = Array.from({ length: 12 }, (_, i) => `Lesson ${i + 1}: Observing the everyday`)

const meta: Meta<typeof ScrollArea> = {
  title: 'Components/ScrollArea/Patterns',
  component: ScrollArea,
}

export default meta
type Story = StoryObj<typeof ScrollArea>

export const NativeScrollCarousel: Story = {
  render: () => (
    <Box maxWidth={640}>
      <ScrollArea orientation="horizontal">
        <Inline gap="md" wrap={false} align="start">
          {COURSES.map((course) => (
            <Box key={course.title} minWidth={250} maxWidth={250}>
              <CardVertical size="sm" {...course} />
            </Box>
          ))}
        </Inline>
      </ScrollArea>
    </Box>
  ),
}

export const ScrollableList: Story = {
  render: () => (
    <ScrollArea orientation="vertical" maxHeight={240}>
      <Stack gap="sm">
        {LESSONS.map((lesson) => (
          <Text key={lesson}>{lesson}</Text>
        ))}
      </Stack>
    </ScrollArea>
  ),
}
