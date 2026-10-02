import { useId, type HTMLAttributes } from 'react'
import { Heading } from '../Heading'
import { Icon } from '../Icon'
import { Image } from '../Image'
import { Inline } from '../Inline'
import { ProgressBar } from '../ProgressBar'
import { Stack } from '../Stack'
import { Text } from '../Text'
import styles from './CardHorizontal.module.css'

export type CardHorizontalVariant = 'default' | 'inverted'

export type CardHorizontalProps = {
  thumbnailSrc?: string
  thumbnailAlt?: string
  title: string
  duration?: string
  certified?: boolean
  progress?: number
  variant?: CardHorizontalVariant
} & Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children' | 'aria-labelledby'>

export function CardHorizontal({
  thumbnailSrc,
  thumbnailAlt = '',
  title,
  duration,
  certified,
  progress,
  variant = 'default',
  className,
  ...rest
}: CardHorizontalProps) {
  const titleId = useId()
  const inverted = variant === 'inverted'
  const metaColor = inverted ? 'inverted-subtle' : 'subtle'

  return (
    <div
      {...rest}
      role="article"
      aria-labelledby={titleId}
      className={[styles.card, styles[variant], className].filter(Boolean).join(' ')}
    >
      <Image src={thumbnailSrc} alt={thumbnailAlt} aspectRatio="1/1" className={styles.thumbnail} />
      <Stack gap="sm" className={styles.content}>
        <Stack gap="xs">
          <Heading
            as="h3"
            id={titleId}
            size="title-small"
            color={inverted ? 'inverted' : undefined}
            className={styles.title}
          >
            {title}
          </Heading>
          {progress !== undefined && <ProgressBar value={progress} aria-labelledby={titleId} />}
        </Stack>
        {(duration || certified) && (
          <Inline gap="sm" wrap align="center">
            {duration && <Text as="span" size="metadata" color={metaColor}>{duration}</Text>}
            {certified && (
              <span className={styles.badge}>
                <Icon name="badge-check" size="sm" />
                <Text as="span" size="metadata" color={metaColor}>Certified</Text>
              </span>
            )}
          </Inline>
        )}
      </Stack>
    </div>
  )
}
