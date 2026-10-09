import { useId, type HTMLAttributes } from 'react'
import { Heading, type HeadingTag } from '../Heading'
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
  /** 0–100. Omit for a course not yet started; 100 renders the completed state. */
  progress?: number
  size?: CardVerticalSize
  headingLevel?: HeadingTag
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children' | 'aria-labelledby' | 'title'>

const ASPECT_RATIO: Record<CardVerticalSize, string> = {
  sm: '3/2',
  lg: '4/5',
}

export function CardVertical({
  thumbnailSrc,
  thumbnailAlt = '',
  title,
  duration,
  certified,
  progress,
  size = 'lg',
  headingLevel = 'h3',
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
        <Image src={thumbnailSrc} alt={thumbnailAlt} aspectRatio={ASPECT_RATIO[size]} className={styles.thumbnail} />
        {progress !== undefined && <ProgressBar value={progress} aria-labelledby={titleId} />}
      </Stack>
      <Stack gap="xs">
        <Heading as={headingLevel} id={titleId} size="headline-serif">
          {title}
        </Heading>
        {(duration || certified || completed) && (
          <Inline gap="md" wrap align="center">
            {duration && <Text as="span" size="body-default" color="subtle">{duration}</Text>}
            {certified && (
              <span className={styles.marker}>
                <Icon name="badge-check" size="sm" />
                <Text as="span" size="metadata" color="subtle">Certified</Text>
              </span>
            )}
            {completed && (
              <span className={styles.marker}>
                <Icon name="check" size="sm" />
                <Text as="span" size="body-default" color="subtle">Completed</Text>
              </span>
            )}
          </Inline>
        )}
      </Stack>
    </div>
  )
}
