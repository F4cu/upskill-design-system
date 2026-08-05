import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../Box'
import { Button } from '../Button'
import { Chip } from '../Chip'
import { Inline } from './index'
import styles from './Inline.stories.module.css'

const meta = {
  title: 'Layout/Inline',
  component: Inline,
  argTypes: {
    as: { control: 'text' },
    gap: {
      control: 'select',
      options: [undefined, 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
    },
    align: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
    },
    wrap: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof Inline>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gap: 'sm',
    children: (
      <>
        <Chip>First</Chip>
        <Chip>Second</Chip>
        <Chip>Third</Chip>
      </>
    ),
  },
}

export const GapScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const).map((gap) => (
        <div key={gap}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '4px' }}>gap="{gap}"</div>
          <Inline gap={gap}>
            <Chip>Alpha</Chip>
            <Chip>Beta</Chip>
            <Chip>Gamma</Chip>
          </Inline>
        </div>
      ))}
    </div>
  ),
}

export const SpaceBetween: Story = {
  args: {
    gap: 'sm',
    justify: 'space-between',
    children: (
      <>
        <Chip>Left</Chip>
        <Chip>Center</Chip>
        <Chip>Right</Chip>
      </>
    ),
  },
}

export const JustifyEnd: Story = {
  render: () => (
    <Box className={styles.demoSurface} padding="md">
      <Inline fullWidth justify="end" gap="sm">
        <Button variant="outlined" shape="square" icon="bookmark" aria-label="Bookmark" />
        <Button variant="default">Add to your cart</Button>
      </Inline>
    </Box>
  ),
}

export const Wrapping: Story = {
  render: () => (
    <Box className={styles.wrapDemo} padding="xs">
      <Inline gap="xs" wrap={true}>
        {Array.from({ length: 10 }, (_, i) => (
          <Chip key={i}>{`Tag ${i + 1}`}</Chip>
        ))}
      </Inline>
    </Box>
  ),
}
