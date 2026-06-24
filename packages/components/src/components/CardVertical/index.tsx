import type { HTMLAttributes } from 'react'
import { Heading } from '../Heading'
import { Icon } from '../Icon'
import { Image } from '../Image'
import { ProgressBar } from '../ProgressBar'
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
} & HTMLAttributes<HTMLDivElement>

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
  return (
    <div
      className={[styles.card, styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Image
        src={thumbnailSrc}
        alt={thumbnailAlt}
        aspectRatio={size === 'lg' ? '4/5' : '3/2'}
        className={styles.thumbnail}
      />
      {progress !== undefined && <ProgressBar value={progress} />}
      <div className={styles.content}>
        <Heading as="h3" size="headline-serif" className={styles.title}>{title}</Heading>
        {(duration || certified) && (
          <div className={styles.meta}>
            {duration && (
              <Text as="span" size="metadata" color="subtle">{duration}</Text>
            )}
            {certified && (
              <span className={styles.badge}>
                <Icon name="badge-check" size="sm" />
                <Text as="span" size="metadata" color="subtle">Certified</Text>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
