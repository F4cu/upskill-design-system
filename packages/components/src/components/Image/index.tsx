import type { CSSProperties, HTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './Image.module.css'

export type ImageProps = {
  src?: string
  alt?: string
  aspectRatio?: string
} & HTMLAttributes<HTMLDivElement>

export function Image({
  src,
  alt = '',
  aspectRatio = '1/1',
  className,
  style,
  ...rest
}: ImageProps) {
  const cssVars = {
    '--_aspect-ratio': aspectRatio,
    ...style,
  } as CSSProperties

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {src
        ? <img src={src} alt={alt} className={styles.img} />
        : <span className={styles.empty} aria-hidden="true">
            <Icon name="image" size="md" className={styles.icon} />
          </span>
      }
    </div>
  )
}
