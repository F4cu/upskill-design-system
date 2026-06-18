import type { Meta, StoryObj } from '@storybook/react'
import { ScrollArea } from './index'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { CardVertical } from '../CardVertical'
import { Text } from '../Text'

const COURSES = [
  { title: 'Change by Design', duration: '12 Hours', certified: true },
  { title: 'Creative Confidence', duration: '8 Hours', certified: true },
  { title: 'The Design of Everyday Things', duration: '10 Hours', certified: true },
  { title: 'The Design Thinking Playbook', duration: '6 Hours', certified: true },
  { title: 'Creative Acts for Curious People', duration: '12 Hours', certified: true },
  { title: 'Full-Stack Web Development', duration: '20 Hours', certified: false },
]

const meta: Meta<typeof ScrollArea> = {
  title: 'Layout/ScrollArea',
  component: ScrollArea,
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
}

export default meta
type Story = StoryObj<typeof ScrollArea>

export const Default: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <div style={{ width: 640 }}>
      <ScrollArea {...args}>
        <Inline gap="md" wrap={false} align="start" style={{ width: 'max-content' }}>
          {COURSES.map((course) => (
            <div key={course.title} style={{ width: 250 }}>
              <CardVertical
                title={course.title}
                duration={course.duration}
                certified={course.certified}
                size="sm"
              />
            </div>
          ))}
        </Inline>
      </ScrollArea>
    </div>
  ),
}

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div style={{ height: 200 }}>
      <ScrollArea {...args} style={{ height: '100%' }}>
        <Stack gap="sm">
          {COURSES.map((course) => (
            <Text key={course.title} size="body-default">{course.title}</Text>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  ),
}
