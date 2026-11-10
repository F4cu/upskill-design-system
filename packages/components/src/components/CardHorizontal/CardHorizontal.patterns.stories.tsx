import type { Meta, StoryObj } from '@storybook/react'
import { CardHorizontal } from './index'
import { Box } from '../Box'
import { Icon } from '../Icon'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { Text } from '../Text'
import styles from './CardHorizontal.patterns.stories.module.css'

const meta: Meta<typeof CardHorizontal> = {
  title: 'Components/CardHorizontal/Patterns',
  component: CardHorizontal,
}

export default meta
type Story = StoryObj<typeof CardHorizontal>

export const StartedCoursesList: Story = {
  render: () => (
    <Stack gap="sm">
      <CardHorizontal title="Creative Acts for Curious People" progress={65} duration="12 Hours" certified />
      <CardHorizontal title="Change by Design" progress={20} duration="8 Hours" />
    </Stack>
  ),
}

export const FooterRecommendations: Story = {
  render: () => (
    <Box background="inverted" padding="lg">
      <Stack gap="md">
        <CardHorizontal variant="inverted" title="Zen Mind, Beginner's Mind" author="Shunryu Suzuki" duration="4 hours, 30min" />
        <CardHorizontal variant="inverted" title="Wherever You Go, There You Are" author="Jon Kabat-Zinn" duration="2 hours, 15min" />
        <CardHorizontal variant="inverted" title="The Miracle of Mindfulness" author="Thich Nhat Hanh" duration="1 hour, 10min" />
      </Stack>
    </Box>
  ),
}

export const CertifiedBadge: Story = {
  render: () => (
    <Inline as="span" gap="xs" align="center" className={styles.certified}>
      <Icon name="badge-check" size="sm" />
      <Text as="span" size="metadata" color="subtle">Certified</Text>
    </Inline>
  ),
}
