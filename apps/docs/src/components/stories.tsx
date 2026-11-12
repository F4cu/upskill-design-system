import type { ComponentType, ReactElement } from 'react'

// Renders a Storybook story from its CSF module without Storybook's runtime
// (ADR-030 Phase A2): meta.args then the story's args, through the story's
// render or meta.component, wrapped in the story's decorators and then
// meta's, as Storybook orders them. Global decorators (theme, brand) are
// skipped: the site's own data-theme drives the tokens.
type Args = Record<string, unknown>
type Decorator = (Story: ComponentType, context: { args: Args }) => ReactElement
type Story = {
  args?: Args
  render?: (args: Args, context: { args: Args }) => ReactElement
  decorators?: Decorator[]
  component?: ComponentType<Args>
}
type Module = Record<string, Story>

const DIR = '../../../../packages/components/src/components'
const stories = import.meta.glob<Module>('../../../../packages/components/src/components/*/*.stories.tsx', { eager: true })

export type StoryFile = 'stories' | 'patterns.stories'

export const pascal = (kebab: string) => kebab.replace(/(?:^|-)([a-z0-9])/g, (_, c: string) => c.toUpperCase())

function lookup(name: string, file: StoryFile, exportName: string) {
  const module = stories[`${DIR}/${name}/${name}.${file}.tsx`]
  const story = module?.[exportName]
  return story && exportName !== 'default' ? { meta: module.default, story } : null
}

export const storyArgs = (name: string, file: StoryFile, exportName: string): Args => {
  const found = lookup(name, file, exportName)
  return found ? { ...found.meta.args, ...found.story.args } : {}
}

// The first defined option a story file's meta offers a prop in its controls.
export const argOption = (name: string, prop: string): unknown => {
  const meta = stories[`${DIR}/${name}/${name}.stories.tsx`]?.default as { argTypes?: Record<string, { options?: unknown[] }> } | undefined
  return meta?.argTypes?.[prop]?.options?.find((o) => o !== undefined)
}

export const hasStory =(name: string, file: StoryFile, exportName: string) => lookup(name, file, exportName) !== null

export function StoryRender({ name, file, exportName }: { name: string; file: StoryFile; exportName: string }) {
  const found = lookup(name, file, exportName)
  if (!found) throw new Error(`${name}.${file}.tsx has no export ${exportName}`)
  const { meta, story } = found
  const args = { ...meta.args, ...story.args }
  const context = { args }
  const Component = meta.component!
  const Inner = () => (story.render ?? meta.render)?.(args, context) ?? <Component {...args} />
  const decorators = [...(story.decorators ?? []), ...(meta.decorators ?? [])]
  const Wrapped = decorators.reduce<ComponentType>((Story, decorate) => () => decorate(Story, context), Inner)
  return <Wrapped />
}
