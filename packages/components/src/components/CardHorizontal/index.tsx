import type { HTMLAttributes } from 'react'
import { Heading } from '../Heading'
import { Icon } from '../Icon'
import { Image } from '../Image'
import { ProgressBar } from '../ProgressBar'
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
} & HTMLAttributes<HTMLDivElement>

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
  const metaItems = [
    duration && (
      <Text key="duration" as="span" size="metadata" color="subtle">{duration}</Text>
    ),
    certified && (
      <span key="certified" className={styles.badge}>
        <Icon name="badge-check" size="sm" />
        <Text as="span" size="metadata" color="subtle">Certified</Text>
      </span>
    ),
  ].filter(Boolean)

  return (
    <div
      className={[styles.card, styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Image src={thumbnailSrc} alt={thumbnailAlt} aspectRatio="1/1" className={styles.thumbnail} />
      <div className={styles.content}>
        <Heading as="h3" size="title-small" className={styles.title}>{title}</Heading>
        {progress !== undefined && <ProgressBar value={progress} />}
        {metaItems.length > 0 && (
          <div className={styles.meta}>
            {metaItems.map((item, i) => (
              <>
                {i > 0 && <span key={`dot-${i}`} className={styles.dot} aria-hidden />}
                {item}
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
