import type { Meta, StoryObj } from '@storybook/react'
import { useSlider } from '../hooks/useSlider'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import { Heading } from '../components/Heading'
import { Text } from '../components/Text'
import { ButtonArrow } from '../components/ButtonArrow'

const CHAPTERS = [
  {
    title: 'Chapter 1: The Experimenter',
    description:
      'Focuses on prototyping, testing, and learning through trial and error. This persona encourages rapid experimentation to discover effective solutions by embracing failure as part of the innovation process. Experimenters are curious risk-takers who use data and feedback to refine ideas continuously and foster a culture of innovation through hands-on learning.',
  },
  {
    title: 'Chapter 2: The Cross-Pollinator',
    description:
      'Combines ideas, technologies, and people from different industries or disciplines to create novel solutions. This persona thrives on diversity and connecting disparate concepts to spark innovation. By exploring unfamiliar environments and mixing perspectives, Cross-Pollinators generate breakthrough insights that would be impossible within a single field or mindset.',
  },
  {
    title: 'Chapter 3: The Hurdler',
    description:
      'Confronts and overcomes obstacles that block progress. This persona is resourceful and persistent, bending rules and finding creative ways to navigate challenges and keep innovation moving forward. Hurdlers excel at turning setbacks into opportunities, often acting as problem-solvers who clear the path for new ideas despite resistance or constraints.',
  },
]

function CourseSliderExample() {
  const slider = useSlider(CHAPTERS.length)
  const chapter = CHAPTERS[slider.currentIndex]

  return (
    <Box style={{ maxWidth: '560px' }}>
      <style>{`@keyframes ds-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <Stack gap="lg">
        <div
          key={slider.currentIndex}
          style={{ animation: 'ds-fade-in 0.25s ease', minHeight: '180px' }}
        >
          <Stack gap="xs">
            <Heading as="h2" size="subheader">{chapter.title}</Heading>
            <Text>{chapter.description}</Text>
          </Stack>
        </div>

        <Inline justify="end" align="center" gap="md">
          <Text size="body-small" color="subtle" as="span">
            Chapter <strong>{slider.currentIndex + 1}</strong> of{' '}
            <strong>{slider.total}</strong>
          </Text>
          <ButtonArrow direction="left" disabled={slider.isFirst} onClick={slider.goPrev} />
          <ButtonArrow direction="right" disabled={slider.isLast} onClick={slider.goNext} />
        </Inline>
      </Stack>
    </Box>
  )
}

function CourseSliderPage() {
  return (
    <Box
      padding="xl"
      style={{
        background: 'var(--ds-color-background-container-page)',
        minHeight: '100vh',
      }}
    >
      <CourseSliderExample />
    </Box>
  )
}

const meta = {
  title: 'Layout/Examples/CourseSlider',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Chapter description stepper using useSlider. One chapter is shown at a time; the keyed container triggers a CSS fade-in on index change. ButtonArrow left/right wire to goPrev/goNext; the left arrow is disabled on the first step and the right arrow on the last. Minimum height on the description block prevents layout shift across chapters of different lengths.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => <CourseSliderPage />,
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `
const slider = useSlider(chapters.length)
const chapter = chapters[slider.currentIndex]

<Box style={{ maxWidth: '560px' }}>
  <Stack gap="lg">
    <div
      key={slider.currentIndex}
      style={{ animation: 'ds-fade-in 0.25s ease', minHeight: '180px' }}
    >
      <Stack gap="xs">
        <Heading as="h2" size="subheader">{chapter.title}</Heading>
        <Text>{chapter.description}</Text>
      </Stack>
    </div>

    <Inline justify="end" align="center" gap="md">
      <Text size="body-small" color="subtle" as="span">
        Chapter <strong>{slider.currentIndex + 1}</strong> of{' '}
        <strong>{slider.total}</strong>
      </Text>
      <ButtonArrow direction="left" disabled={slider.isFirst} onClick={slider.goPrev} />
      <ButtonArrow direction="right" disabled={slider.isLast} onClick={slider.goNext} />
    </Inline>
  </Stack>
</Box>
`.trim(),
      },
    },
  },
}
