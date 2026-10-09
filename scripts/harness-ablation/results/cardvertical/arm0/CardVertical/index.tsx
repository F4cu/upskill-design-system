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
  /** Pre-formatted duration, e.g. "2h 30m". */
  duration?: string
  certified?: boolean
  /** Learner progress, 0–100. Omit for courses not started; 100 marks the course completed. */
  progress?: number
  /** `sm` for carousels (e.g. saved courses), `lg` for the catalog grid. */
  size?: CardVerticalSize
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children' | 'aria-labelledby'>

export function CardVertical({
  thumbnailSrc,
  thumbnailAlt = '',
  title,
  duration,
  certified,
  progress,
  size = 'lg',
  className,
  ...rest
}: CardVerticalProps) {
  const titleId = useId()
  const completed = progress !== undefined && progress >= 100

  return (
    <div
      {...rest}
      role="article"
      aria-labelledby={titleId}
      className={[styles.card, styles[size], className].filter(Boolean).join(' ')}
    >
      <Stack gap="sm">
        <Image src={thumbnailSrc} alt={thumbnailAlt} className={styles.thumbnail} />
        {progress !== undefined && <ProgressBar value={progress} aria-labelledby={titleId} />}
      </Stack>
      <Stack gap="xs">
        <Heading
          as="h3"
          id={titleId}
          size={size === 'lg' ? 'headline-serif' : 'subheader'}
          className={styles.title}
        >
          {title}
        </Heading>
        {(duration || certified || completed) && (
          <Inline gap="md" wrap align="center">
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
