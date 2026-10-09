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

export type CardVerticalHeadingLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type CardVerticalStatus = 'notStarted' | 'inProgress' | 'completed'

export type CardVerticalProps = {
  title: string
  thumbnailSrc?: string
  thumbnailAlt?: string
  duration?: string
  certified?: boolean
  /** Percent complete, 0–100. Omit for a course not started; 100 marks it completed. */
  progress?: number
  size?: CardVerticalSize
  headingLevel?: CardVerticalHeadingLevel
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children' | 'aria-labelledby' | 'title'>

function getCardVerticalStatus(progress: number | undefined): CardVerticalStatus {
  if (progress === undefined) return 'notStarted'
  return progress >= 100 ? 'completed' : 'inProgress'
}

export function CardVertical({
  title,
  thumbnailSrc,
  thumbnailAlt = '',
  duration,
  certified = false,
  progress,
  size = 'lg',
  headingLevel = 'h3',
  className,
  ...rest
}: CardVerticalProps) {
  const titleId = useId()
  const status = getCardVerticalStatus(progress)
  const completed = status === 'completed'

  return (
    <div
      {...rest}
      role="article"
      aria-labelledby={titleId}
      data-status={status}
      className={[styles.card, styles[size], className].filter(Boolean).join(' ')}
    >
      <Image src={thumbnailSrc} alt={thumbnailAlt} className={styles.thumbnail} />
      <Stack gap="sm">
        {progress !== undefined && <ProgressBar value={progress} aria-labelledby={titleId} />}
        <Stack gap="xs">
          <Heading as={headingLevel} id={titleId} size="headline-serif">
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
      </Stack>
    </div>
  )
}
