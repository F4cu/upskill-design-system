import { beforeAll } from 'vitest'
import { setProjectAnnotations } from '@storybook/react-vite'
import preview from './.storybook/preview'

const annotations = setProjectAnnotations([preview])
beforeAll(annotations.beforeAll)
