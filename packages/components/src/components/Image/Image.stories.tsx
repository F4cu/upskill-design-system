import type { Meta, StoryObj } from '@storybook/react'
import { Image } from './index'

const makeSrc = (w: number, h: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#D15D50"/><text x="${w / 2}" y="${h / 2}" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" dominant-baseline="central" style="line-height:1">Course</text></svg>`)}`

const SAMPLE_SRC = makeSrc(320, 180)

const meta = {
  title: 'Components/Image',
  component: Image,
  argTypes: {
    aspectRatio: { control: 'text' },
    src: { control: 'text' },
    alt: { control: 'text' },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Image>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { aspectRatio: '1/1' },
  decorators: [(Story) => <div style={{ width: 80 }}><Story /></div>],
}

export const WithImage: Story = {
  args: { aspectRatio: '1/1', src: makeSrc(80, 80), alt: 'Course thumbnail' },
  decorators: [(Story) => <div style={{ width: 80 }}><Story /></div>],
}

export const Landscape: Story = {
  args: { aspectRatio: '16/9' },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}

export const LandscapeWithImage: Story = {
  args: { aspectRatio: '16/9', src: SAMPLE_SRC, alt: 'Course banner' },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}

export const FullWidth: Story = {
  args: { aspectRatio: '16/9' },
}

export const FullWidthWithImage: Story = {
  args: { aspectRatio: '16/9', src: SAMPLE_SRC, alt: 'Course banner' },
}

export const Portrait: Story = {
  args: { aspectRatio: '4/5' },
  decorators: [(Story) => <div style={{ width: 277 }}><Story /></div>],
}

export const PortraitWithImage: Story = {
  args: { aspectRatio: '4/5', src: makeSrc(277, 346), alt: 'Course poster' },
  decorators: [(Story) => <div style={{ width: 277 }}><Story /></div>],
}
