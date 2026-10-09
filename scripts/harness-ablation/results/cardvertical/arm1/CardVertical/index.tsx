import { useId, type HTMLAttributes } from 'react'
import { Heading } from '../Heading'
import { Icon } from '../Icon'
import { Image } from '../Image'
import { Inline } from '../Inline'
import { ProgressBar } from '../ProgressBar'
import { Stack } from '../Stack'
import { Text } from '../Text'
import styles from './CardVertical.module.css'

export type CardVerticalSize = 'sm' | 'lg'

export type CardVerticalProps = {
  thumbnailSrc?: string
  thumbnailAlt?: string
  title: string
  duration?: string
  certified?: boolean
  progress?: number
  size?: CardVerticalSize
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children' | 'aria-labelledby' | 'color'>

const thumbnailAspectRatio: Record<CardVerticalSize, string> = {
  sm: '3/2',
  lg: '4/5',
}

function getStatus(progress?: number) {
  if (progress === undefined) return 'notStarted'
  return progress >= 100 ? 'completed' : 'inProgress'
}

export function CardVertical({
  thumbnailSrc,
  thumbnailAlt = '',
  title,
  duration,
  certified = false,
  progress,
  size = 'lg',
  className,
  ...rest
}: CardVerticalProps) {
  const titleId = useId()
  const status = getStatus(progress)
  const completed = status === 'completed'

  return (
    <div
      {...rest}
      role="article"
      aria-labelledby={titleId}
      data-status={status}
      className={[styles.card, styles[size], className].filter(Boolean).join(' ')}
    >
      <Stack gap="sm">
        <Image src={thumbnailSrc} alt={thumbnailAlt} aspectRatio={thumbnailAspectRatio[size]} />
        {progress !== undefined && <ProgressBar value={progress} aria-labelledby={titleId} />}
      </Stack>
      <Stack gap="xs">
        <Heading as="h3" id={titleId} size="title-small" className={styles.title}>
          {title}
        </Heading>
        {(duration || certified || completed) && (
          <Inline gap="sm" wrap align="center">
            {duration && <Text as="span" size="metadata" color="subtle">{duration}</Text>}
            {certified && (
              <span className={styles.marker}>
                <Icon name="badge-check" size="sm" />
                <Text as="span" size="metadata" color="subtle">Certified</Text>
              </span>
            )}
            {completed && (
              <span className={styles.marker}>
                <Icon name="check" size="sm" />
                <Text as="span" size="metadata" color="subtle">Completed</Text>
              </span>
            )}
          </Inline>
        )}
      </Stack>
    </div>
  )
}
