import type { Meta, StoryObj } from '@storybook/react'
import { Box } from './index'
import { AppHeader } from '../AppHeader'
import { Heading } from '../Heading'
import { Stack } from '../Stack'
import { Text } from '../Text'
import logoLight from '../../assets/logos/brand-logo-light-theme.svg'
import logoDark from '../../assets/logos/brand-logo-dark-theme.svg'

const NAV_ITEMS = [
  { label: 'Discover', href: '#', current: true },
  { label: 'My courses', href: '#' },
]

const meta: Meta<typeof Box> = {
  title: 'Components/Box/Patterns',
  component: Box,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof Box>

export const PageLandmarks: Story = {
  render: () => (
    <Box as="main">
      <AppHeader logoSrc={logoLight} logoSrcDark={logoDark} logoAlt="UpSkill" navItems={NAV_ITEMS} />
      <Box as="section" aria-labelledby="page-landmarks-courses" paddingY="xl">
        <Box className="container">
          <Stack gap="md">
            <Heading id="page-landmarks-courses" as="h1" size="headline">Your courses</Heading>
            <Text>Each section is a landmark named by its heading.</Text>
          </Stack>
        </Box>
      </Box>
      <Box as="footer" background="inverted" borderTop="inverted" paddingY="xl">
        <Box className="container">
          <Text size="body-small" color="inverted-subtle">© UpSkill</Text>
        </Box>
      </Box>
    </Box>
  ),
}
